"""
Google Trends Data Collector for Disease Tracking
==================================================
Collects time-series + per-country popularity for 21 tracked diseases and
upserts them into Supabase tables `google_trends` and `google_trends_regions`.

Runs weekly via GitHub Actions (.github/workflows/collect-google-trends.yml).

Design notes (why this script looks the way it does):

  1. Pytrends 4.9.2 sends `"userConfig": {"userType": "USER_TYPE_SCRAPER"}` in
     every payload, which makes Google's anti-bot apply scraper-tier rate
     limits. We monkey-patch `build_payload` to rewrite that field to
     `USER_TYPE_LEGIT_USER` before any request goes out.

  2. We send realistic Chrome headers (User-Agent, Sec-Ch-Ua, etc.) on the
     underlying requests.Session so we don't look like Python `requests`.

  3. We use `comparative` mode (5 diseases per `build_payload`) by default
     to cut request volume ~4x. The frontend re-normalizes per-disease, so
     comparative batching loses nothing visible to users.

  4. We use a 3-month `TIMEFRAME`, so one missed weekly run causes zero gap.

  5. Each pytrends call is independent: a 429 on `interest_by_region` does
     NOT discard already-collected `interest_over_time` data. Uploads happen
     immediately after each call succeeds.

  6. Retry policy is fast-fail (1 retry). Long backoffs amplify rate-limit
     flagging; better to give up on a disease and let next week's run get it.

  7. Disease order is shuffled per run, so we don't fingerprint as the same
     bot making the same N requests in the same order each week.

  8. Exit code is honest: 1 on total failure, 2 on degraded run, 0 only when
     at least MIN_SUCCESS_RATIO of diseases produced data.
"""

import os
import time
import random
import json
from datetime import datetime, timedelta, timezone

from pytrends.request import TrendReq
from supabase import create_client, Client


# ===========================================================================
# Anti-detection: patch pytrends to identify as a legitimate user
# ===========================================================================

_orig_build_payload = TrendReq.build_payload


def _patched_build_payload(self, *args, **kwargs):
    """Wrap pytrends' build_payload so the outgoing request says we're a
    real user, not a scraper. This is the single biggest unblock for 429s."""
    result = _orig_build_payload(self, *args, **kwargs)
    try:
        payload = getattr(self, "token_payload", None)
        if isinstance(payload, dict) and "req" in payload:
            req_raw = payload["req"]
            req = json.loads(req_raw) if isinstance(req_raw, str) else req_raw
            req.setdefault("userConfig", {})["userType"] = "USER_TYPE_LEGIT_USER"
            payload["req"] = json.dumps(req) if isinstance(req_raw, str) else req
    except Exception:
        # Patch must never break the underlying call
        pass
    return result


TrendReq.build_payload = _patched_build_payload


# Realistic Chrome 131 fingerprint. Pytrends' default headers are obviously
# automated; these match what a real desktop browser sends.
BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/131.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Sec-Ch-Ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-site",
    "Referer": "https://trends.google.com/",
}


# ===========================================================================
# Configuration
# ===========================================================================

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE = os.environ.get("SUPABASE_SERVICE_ROLE")

TRACKED_DISEASES = [
    "influenza",
    "H3N2",
    "covid",
    "measles",
    "cholera",
    "ebola",
    "marburg virus",
    "dengue fever",
    "yellow fever",
    "zika virus",
    "plague",
    "mpox",
    "meningitis",
    "norovirus",
    "RSV virus",
    "SARS",
    "MERS",
    "bird flu",
    "hand foot mouth disease",
    "polio",
    "hepatitis A",
]

# Query mode: "comparative" batches 5 diseases per build_payload (4x fewer
# requests). "individual" is kept for diagnostic runs.
QUERY_MODE = "comparative"
BATCH_SIZE = 5

# 3-month window: one missed weekly cron causes no data gap.
TIMEFRAME = "today 3-m"

# Delays — jittered to look less like a fixed scraper cadence.
DELAY_BETWEEN_GROUPS_MIN = 60
DELAY_BETWEEN_GROUPS_MAX = 180
DELAY_BETWEEN_CALLS_MIN = 5
DELAY_BETWEEN_CALLS_MAX = 15
DELAY_ON_ERROR = 240

# Adaptive throttling: after any group fails to produce data we assume the
# IP is being rate-limited and lengthen remaining inter-group delays by this
# multiplier. Lets the rate-limit token bucket refill before we hit it again.
THROTTLED_DELAY_MULTIPLIER = 4

# Fast-fail: one quick retry per group, then move on. Long backoffs deepen
# Google's IP flag instead of clearing it.
MAX_RETRIES = 1

# Data filtering
INCLUDE_LOW_VOLUME_REGIONS = False
EXCLUDE_PARTIAL_DATA = True
EXCLUDE_RECENT_DAYS = 3

# Healthy-exit threshold: at least 50% of diseases must produce data.
MIN_SUCCESS_RATIO = 0.5

ENABLE_DIAGNOSTIC_LOGGING = False


# ===========================================================================
# Init helpers
# ===========================================================================

def validate_environment():
    if not SUPABASE_URL:
        raise ValueError("Missing SUPABASE_URL environment variable")
    if not SUPABASE_SERVICE_ROLE:
        raise ValueError("Missing SUPABASE_SERVICE_ROLE environment variable")
    print("✓ Environment variables validated")


def create_supabase_client() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE)


def create_pytrends_client() -> TrendReq:
    """
    Pytrends client with realistic browser headers and no internal retries.
    The script's outer loop is the only retry layer — pytrends' own retry
    would compound and amplify 429s.
    """
    return TrendReq(
        hl="en-US",
        tz=-480,  # Pacific Time — matches the Google Trends website
        retries=0,
        backoff_factor=0,
        requests_args={"headers": BROWSER_HEADERS},
    )


def normalize_region_name(region: str) -> str:
    """Normalize Google Trends region names to match our geocoding lookup."""
    region = region.strip()
    mappings = {
        "US": "United States",
        "USA": "United States",
        "UK": "United Kingdom",
        "Congo - Kinshasa": "Democratic Republic of Congo",
        "Congo - Brazzaville": "Congo",
        "DRC": "Democratic Republic of Congo",
        "Myanmar (Burma)": "Myanmar",
        "Burma": "Myanmar",
    }
    return mappings.get(region, region)


def validate_data_quality(time_series_records: list, region_records: list, disease: str):
    """Soft data-quality check — prints warnings only, never rejects rows."""
    issues = []
    if time_series_records and all(r["interest_value"] == 0 for r in time_series_records):
        issues.append("all time-series values are 0")
    if region_records and len(region_records) < 10:
        issues.append(f"only {len(region_records)} regions returned")
    if issues:
        print(f"    ⚠ Data quality for {disease}: {', '.join(issues)}")


# ===========================================================================
# Group-level fetch — ONE HTTP call per endpoint returns data for all
# diseases in the group. Pytrends works by building one payload over a list
# of keywords and returning a dataframe with one column per keyword.
# Calling interest_over_time() N times per group would make N HTTP requests
# returning the same data — wasted requests that trigger rate limits.
# ===========================================================================

def fetch_time_series_for_group(pytrends: TrendReq, diseases: list) -> dict:
    """
    Single HTTP call returns time-series for all diseases in `diseases`.
    Returns {disease: [records]}. Empty list for any disease whose column
    is missing (Google sometimes drops low-volume keywords from a batch).
    Never raises.
    """
    out = {d: [] for d in diseases}

    try:
        df_time = pytrends.interest_over_time()
    except Exception as e:
        print(f"    ✗ interest_over_time({diseases}): {type(e).__name__}: {e}")
        return out

    if ENABLE_DIAGNOSTIC_LOGGING and not df_time.empty:
        print(f"    [DEBUG] time-series for {diseases}:\n{df_time.to_string()}")

    if df_time.empty:
        print(f"    ⚠ time-series: empty response for {diseases}")
        return out

    cutoff = None
    if EXCLUDE_PARTIAL_DATA:
        cutoff = datetime.now(timezone.utc).date() - timedelta(days=EXCLUDE_RECENT_DAYS)

    excluded_recent = 0
    excluded_partial = 0
    for date_index, row in df_time.iterrows():
        date_obj = (
            date_index.date() if hasattr(date_index, "date")
            else datetime.fromtimestamp(date_index.timestamp()).date()
        )
        if cutoff and date_obj > cutoff:
            excluded_recent += 1
            continue
        is_partial = bool(row["isPartial"]) if "isPartial" in row else False
        if EXCLUDE_PARTIAL_DATA and is_partial:
            excluded_partial += 1
            continue
        for disease in diseases:
            if disease in df_time.columns:
                out[disease].append({
                    "disease": disease,
                    "date": date_obj.isoformat(),
                    "interest_value": int(row[disease]),
                })

    for disease in diseases:
        if out[disease]:
            suffix = ""
            if excluded_recent or excluded_partial:
                suffix = f" (excluded {excluded_recent} recent, {excluded_partial} partial)"
            print(f"    ✓ {disease}: {len(out[disease])} time-series rows{suffix}")
        elif disease in df_time.columns:
            print(f"    ⚠ {disease}: no usable time-series rows after filtering")
        else:
            print(f"    ⚠ {disease}: dropped from time-series response (low volume?)")

    return out


def fetch_regions_for_group(
    pytrends: TrendReq, diseases: list, collection_date: str
) -> dict:
    """
    Single HTTP call returns regions for all diseases in `diseases`.
    Returns {disease: [records]}. Never raises.
    """
    out = {d: [] for d in diseases}

    try:
        df_region = pytrends.interest_by_region(
            resolution="COUNTRY",
            inc_low_vol=INCLUDE_LOW_VOLUME_REGIONS,
            inc_geo_code=False,
        )
    except Exception as e:
        print(f"    ✗ interest_by_region({diseases}): {type(e).__name__}: {e}")
        return out

    if ENABLE_DIAGNOSTIC_LOGGING and not df_region.empty:
        print(f"    [DEBUG] regions for {diseases}:\n{df_region.to_string()}")

    if df_region.empty:
        print(f"    ⚠ regions: empty response for {diseases}")
        return out

    for disease in diseases:
        if disease not in df_region.columns:
            print(f"    ⚠ {disease}: dropped from regions response (low volume?)")
            continue
        for region, score in df_region[disease].dropna().items():
            out[disease].append({
                "disease": disease,
                "region": normalize_region_name(region),
                "region_code": None,
                "popularity_score": int(score),
                "date": collection_date,
            })
        if out[disease]:
            print(f"    ✓ {disease}: {len(out[disease])} region rows")

    return out


# ===========================================================================
# Upload — batched upserts
# ===========================================================================

def upload_time_series(supabase: Client, records: list):
    if not records:
        return
    for i in range(0, len(records), 100):
        supabase.table("google_trends").upsert(
            records[i:i + 100], on_conflict="disease,date"
        ).execute()


def upload_regions(supabase: Client, records: list):
    if not records:
        return
    for i in range(0, len(records), 100):
        supabase.table("google_trends_regions").upsert(
            records[i:i + 100], on_conflict="disease,region,date"
        ).execute()


# ===========================================================================
# Group orchestrator — one build_payload, two independent fetch/upload cycles
# ===========================================================================

def collect_data_for_group(
    pytrends: TrendReq,
    supabase: Client,
    diseases: list,
    collection_date: str,
) -> set:
    """
    Build one payload for the given group of diseases (1 if individual mode,
    up to BATCH_SIZE if comparative). Then fetch + upload each pytrends
    endpoint independently — a failure in one never discards data from the
    other.

    Returns: the set of diseases for which at least one row was uploaded.
    """
    successful: set = set()

    try:
        pytrends.build_payload(list(diseases), timeframe=TIMEFRAME, geo="")
    except Exception as e:
        print(f"    ✗ build_payload({diseases}): {type(e).__name__}: {e}")
        return successful

    time.sleep(random.uniform(DELAY_BETWEEN_CALLS_MIN, DELAY_BETWEEN_CALLS_MAX))

    # --- Time-series: ONE HTTP call returns all diseases; upload per-disease ---
    ts_by_disease = fetch_time_series_for_group(pytrends, diseases)
    for disease, records in ts_by_disease.items():
        if not records:
            continue
        try:
            upload_time_series(supabase, records)
            print(f"    ✓ uploaded {len(records)} time-series rows for {disease}")
            successful.add(disease)
        except Exception as e:
            print(f"    ✗ upload time-series for {disease}: {e}")

    time.sleep(random.uniform(DELAY_BETWEEN_CALLS_MIN, DELAY_BETWEEN_CALLS_MAX))

    # --- Regions: ONE HTTP call returns all diseases; upload per-disease ---
    reg_by_disease = fetch_regions_for_group(pytrends, diseases, collection_date)
    for disease, records in reg_by_disease.items():
        if not records:
            continue
        try:
            upload_regions(supabase, records)
            print(f"    ✓ uploaded {len(records)} region rows for {disease}")
            successful.add(disease)
        except Exception as e:
            print(f"    ✗ upload regions for {disease}: {e}")

    for disease in diseases:
        validate_data_quality(
            ts_by_disease.get(disease, []),
            reg_by_disease.get(disease, []),
            disease,
        )

    return successful


# ===========================================================================
# Main
# ===========================================================================

def collect_all_trends():
    print("=" * 60)
    print("Google Trends Data Collection")
    print(f"Started at: {datetime.now(timezone.utc).isoformat()}")
    print("=" * 60)

    validate_environment()
    supabase = create_supabase_client()
    pytrends = create_pytrends_client()

    collection_date = datetime.now(timezone.utc).date().isoformat()

    # Randomize order so we don't fingerprint as the same scraper hitting
    # the same N keywords in the same order each week.
    diseases = list(TRACKED_DISEASES)
    random.shuffle(diseases)

    if QUERY_MODE == "comparative":
        groups = [diseases[i:i + BATCH_SIZE] for i in range(0, len(diseases), BATCH_SIZE)]
    else:
        groups = [[d] for d in diseases]

    print(f"\nMode: {QUERY_MODE}  |  Timeframe: {TIMEFRAME}")
    print(f"Groups: {len(groups)}  |  Diseases: {len(diseases)}")
    print(f"Delays: groups {DELAY_BETWEEN_GROUPS_MIN}-{DELAY_BETWEEN_GROUPS_MAX}s, "
          f"calls {DELAY_BETWEEN_CALLS_MIN}-{DELAY_BETWEEN_CALLS_MAX}s, "
          f"error {DELAY_ON_ERROR}s")
    print(f"Retries: {MAX_RETRIES} per group (fast-fail)")
    print("-" * 60)

    successful_diseases: set = set()
    throttled_mode = False  # flipped on the first group that fails to deliver data

    for group_idx, group in enumerate(groups, 1):
        print(f"\n[Group {group_idx}/{len(groups)}] {', '.join(group)}")

        group_success: set = set()
        attempt = 0
        while attempt <= MAX_RETRIES:
            remaining = [d for d in group if d not in group_success]
            if not remaining:
                break
            if attempt > 0:
                delay = DELAY_ON_ERROR + random.uniform(0, 60)
                print(f"    Retry {attempt}/{MAX_RETRIES} for {remaining} after {delay:.0f}s")
                time.sleep(delay)
            group_success |= collect_data_for_group(
                pytrends, supabase, remaining, collection_date
            )
            attempt += 1

        successful_diseases |= group_success

        # If this group didn't fully succeed, assume rate-limiting and bump
        # delays for the remainder of the run.
        if len(group_success) < len(group):
            if not throttled_mode:
                print(f"    ⚠ Group only got {len(group_success)}/{len(group)} — "
                      f"entering throttled mode (delays x{THROTTLED_DELAY_MULTIPLIER})")
            throttled_mode = True

        if group_idx < len(groups):
            base = random.uniform(DELAY_BETWEEN_GROUPS_MIN, DELAY_BETWEEN_GROUPS_MAX)
            delay = base * THROTTLED_DELAY_MULTIPLIER if throttled_mode else base
            mode_tag = " [throttled]" if throttled_mode else ""
            print(f"    Waiting {delay:.0f}s before next group{mode_tag}...")
            time.sleep(delay)

    # ----- Summary + honest exit code -----
    n_total = len(TRACKED_DISEASES)
    n_ok = len(successful_diseases)
    success_ratio = n_ok / n_total if n_total else 0
    failed = sorted(set(TRACKED_DISEASES) - successful_diseases)

    print("\n" + "=" * 60)
    print("Collection Complete")
    print("=" * 60)
    print(f"Successful: {n_ok}/{n_total} ({success_ratio:.0%})")
    if successful_diseases:
        print(f"  ✓ {', '.join(sorted(successful_diseases))}")
    if failed:
        print(f"Failed: {len(failed)}/{n_total}")
        print(f"  ✗ {', '.join(failed)}")
    print(f"Finished at: {datetime.now(timezone.utc).isoformat()}")
    print("=" * 60)

    if n_ok == 0:
        print("\n⚠ CRITICAL: all diseases failed — exiting 1")
        exit(1)
    if success_ratio < MIN_SUCCESS_RATIO:
        print(f"\n⚠ DEGRADED: only {n_ok}/{n_total} ({success_ratio:.0%}) succeeded "
              f"(threshold {MIN_SUCCESS_RATIO:.0%}) — exiting 2")
        exit(2)
    if failed:
        print(f"\n⚠ Partial: {len(failed)} disease(s) failed but {n_ok} succeeded — exiting 0")


# ===========================================================================
# Entry point
# ===========================================================================

if __name__ == "__main__":
    collect_all_trends()
