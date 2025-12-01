"""
Google Trends Data Collector for Disease Tracking (Fixed & Improved)
=====================================================================
Collects last 30 days of Google Trends data for 20 diseases individually
and upserts into Supabase with proper conflict handling.
"""

import os
import time
from datetime import datetime

from pytrends.request import TrendReq
from supabase import create_client, Client


# =============================================================================
# Configuration
# =============================================================================

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE = os.environ.get("SUPABASE_SERVICE_ROLE")

TRACKED_DISEASES = [
    "influenza", "covid", "measles", "cholera", "ebola",
    "marburg virus", "dengue fever", "yellow fever", "zika virus",
    "plague", "mpox", "meningitis", "norovirus", "RSV virus",
    "SARS", "MERS", "bird flu", "hand foot mouth disease",
    "polio", "hepatitis A",
]

DELAY_BETWEEN_REQUESTS = 2
DELAY_ON_ERROR = 15
MAX_RETRIES = 3


# =============================================================================
# Clients
# =============================================================================

def get_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE:
        raise ValueError("Missing Supabase credentials")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE)


def get_pytrends() -> TrendReq:
    return TrendReq(hl="en-US", tz=0, retries=3, backoff_factor=0.5)


# =============================================================================
# Core Logic
# =============================================================================

def fetch_disease_data(pytrends: TrendReq, disease: str) -> list[dict]:
    records = []
    pytrends.build_payload([disease], timeframe="today 1-m", geo="")
    df = pytrends.interest_over_time()

    if df.empty or disease not in df.columns:
        print(f"  No data for: {disease}")
        return records

    for date_idx, row in df.iterrows():
        if row[disease] > 0:  # Only store non-zero values
            records.append({
                "disease": disease,
                "date": date_idx.strftime("%Y-%m-%d"),
                "interest_value": int(row[disease]),
            })
    return records


def upsert_records(supabase: Client, records: list[dict]):
    if not records:
        return
    for i in range(0, len(records), 100):
        batch = records[i:i + 100]
        supabase.table("google_trends").upsert(
            batch,
            on_conflict="disease,date"
        ).execute()


# =============================================================================
# Main
# =============================================================================

def main():
    print("=" * 60)
    print("Google Trends Disease Tracker")
    print(f"Started: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%SZ')}")
    print("=" * 60)

    supabase = get_supabase()
    pytrends = get_pytrends()

    success = fail = total_records = 0

    for i, disease in enumerate(TRACKED_DISEASES, 1):
        print(f"\n[{i}/{len(TRACKED_DISEASES)}] {disease}", end="")
        retries = 0
        done = False

        while retries < MAX_RETRIES and not done:
            try:
                records = fetch_disease_data(pytrends, disease)
                if records:
                    upsert_records(supabase, records)
                    total_records += len(records)
                print(f" → {len(records)} pts")
                success += 1
                done = True
            except Exception as e:
                retries += 1
                print(f" (retry {retries}: {str(e)[:50]})")
                time.sleep(DELAY_ON_ERROR)
                pytrends = get_pytrends()  # Reset session

        if not done:
            print(" → FAILED")
            fail += 1

        if i < len(TRACKED_DISEASES):
            time.sleep(DELAY_BETWEEN_REQUESTS)

    print("\n" + "=" * 60)
    print(f"DONE | Success: {success} | Failed: {fail} | Records: {total_records}")
    print(f"Ended: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%SZ')}")
    print("=" * 60)

    if fail:
        exit(1)


if __name__ == "__main__":
    main()
