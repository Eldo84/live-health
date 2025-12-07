"""
Google Trends Data Collector (Grouped Version)
===============================================
Fetches Google Trends data in groups of 5 diseases to ensure correct
relative normalization (matching Google Trends UI comparisons).
Collects both time-series data (interest_over_time) and region popularity
data (interest_by_region). Upserts into Supabase with conflict handling.
"""

import os
import time
from datetime import datetime

from pytrends.request import TrendReq
from supabase import create_client, Client


# --------------------------------------------------------------------
# Configuration
# --------------------------------------------------------------------

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE = os.environ.get("SUPABASE_SERVICE_ROLE")

TRACKED_DISEASES = [
    "influenza", "covid", "measles", "cholera", "ebola",
    "marburg virus", "dengue fever", "yellow fever", "zika virus",
    "plague", "mpox", "meningitis", "norovirus", "RSV virus",
    "SARS", "MERS", "bird flu", "hand foot mouth disease",
    "polio", "hepatitis A",
]

# Google Trends limit
GROUP_SIZE = 5

DELAY_BETWEEN_REQUESTS = 2
DELAY_ON_ERROR = 15
MAX_RETRIES = 3


# --------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------

def chunk_list(lst, size):
    """Split list into chunks of size n."""
    for i in range(0, len(lst), size):
        yield lst[i:i + size]


def get_pytrends():
    return TrendReq(hl="en-US", tz=0, retries=3, backoff_factor=0.5)


def get_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE:
        raise ValueError("Missing Supabase credentials")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE)


# --------------------------------------------------------------------
# Google Trends Fetch
# --------------------------------------------------------------------

def fetch_group_data(pytrends: TrendReq, diseases: list[str]) -> list[dict]:
    """Fetch Google Trends values for a group of up to 5 diseases."""
    pytrends.build_payload(diseases, timeframe="today 1-m", geo="")
    df = pytrends.interest_over_time()

    if df.empty:
        print("  No data returned for group")
        return []

    records = []

    for date_idx, row in df.iterrows():
        date = date_idx.date().isoformat()

        for disease in diseases:
            value = row.get(disease, 0)

            if value > 0:
                records.append({
                    "disease": disease,
                    "date": date,
                    "interest_value": int(value),
                })

    return records


def upsert_records(supabase: Client, records: list[dict]):
    if not records:
        return

    for i in range(0, len(records), 100):
        batch = records[i:i+100]
        supabase.table("google_trends").upsert(
            batch,
            on_conflict="disease,date"
        ).execute()


# --------------------------------------------------------------------
# Region Name Normalization
# --------------------------------------------------------------------

def normalize_region_name(region: str) -> str:
    """
    Normalize Google Trends region names to match our geocoding lookup.
    Handles common variations and special cases.
    """
    region = region.strip()
    
    # Common mappings
    mappings = {
        "United States": "United States",
        "US": "United States",
        "USA": "United States",
        "United Kingdom": "United Kingdom",
        "UK": "United Kingdom",
        "Congo - Kinshasa": "Democratic Republic of Congo",
        "Congo - Brazzaville": "Congo",
        "DRC": "Democratic Republic of Congo",
        "Myanmar (Burma)": "Myanmar",
        "Burma": "Myanmar",
    }
    
    if region in mappings:
        return mappings[region]
    
    # Return as-is if no mapping found
    return region


# --------------------------------------------------------------------
# Region Data Fetch
# --------------------------------------------------------------------

def fetch_region_data(pytrends: TrendReq, diseases: list[str]) -> list[dict]:
    """
    Fetch Google Trends region popularity data for a group of up to 5 diseases.
    Returns list of records with disease, region, popularity_score, and date.
    """
    try:
        # Build payload (reuse same payload from time-series fetch)
        pytrends.build_payload(diseases, timeframe="today 1-m", geo="")
        
        # Fetch interest by region (country level)
        df = pytrends.interest_by_region(resolution="COUNTRY", inc_low_vol=True, inc_geo_code=False)
        
        if df.empty:
            print("  No region data returned for group")
            return []
        
        records = []
        today = datetime.utcnow().date().isoformat()
        
        # Process each disease
        for disease in diseases:
            if disease not in df.columns:
                continue
            
            # Get region data for this disease
            disease_data = df[disease].dropna()
            
            for region, score in disease_data.items():
                # Skip if score is 0 (insufficient data)
                if score == 0:
                    continue
                
                # Normalize region name
                normalized_region = normalize_region_name(region)
                
                records.append({
                    "disease": disease,
                    "region": normalized_region,
                    "region_code": None,  # Could be enhanced with ISO code lookup
                    "popularity_score": int(score),
                    "date": today,
                })
        
        return records
    
    except Exception as e:
        print(f"  Error fetching region data: {str(e)[:100]}")
        return []


def upsert_region_records(supabase: Client, records: list[dict]):
    """Upsert region popularity records into google_trends_regions table."""
    if not records:
        return
    
    for i in range(0, len(records), 100):
        batch = records[i:i+100]
        supabase.table("google_trends_regions").upsert(
            batch,
            on_conflict="disease,region,date"
        ).execute()


# --------------------------------------------------------------------
# Main
# --------------------------------------------------------------------

def main():
    print("=" * 60)
    print("Google Trends Disease Tracker (Grouped Mode)")
    print(f"Started: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%SZ')}")
    print("=" * 60)

    supabase = get_supabase()
    pytrends = get_pytrends()

    success = fail = total_records = total_region_records = 0

    disease_groups = list(chunk_list(TRACKED_DISEASES, GROUP_SIZE))

    for i, group in enumerate(disease_groups, 1):
        print(f"\n[{i}/{len(disease_groups)}] Fetching group: {group}")

        retries = 0
        done = False

        while retries < MAX_RETRIES and not done:
            try:
                # Fetch time-series data
                records = fetch_group_data(pytrends, group)
                upsert_records(supabase, records)
                total_records += len(records)
                print(f"  → {len(records)} time-series pts stored")
                
                # Fetch region popularity data
                region_records = fetch_region_data(pytrends, group)
                upsert_region_records(supabase, region_records)
                total_region_records += len(region_records)
                print(f"  → {len(region_records)} region popularity pts stored")
                
                success += 1
                done = True
            except Exception as e:
                retries += 1
                print(f"  (retry {retries}: {str(e)[:80]})")
                time.sleep(DELAY_ON_ERROR)
                pytrends = get_pytrends()  # Reset session after error

        if not done:
            print("  → FAILED")
            fail += 1

        if i < len(disease_groups):
            time.sleep(DELAY_BETWEEN_REQUESTS)

    print("\n" + "=" * 60)
    print(f"Completed | Success: {success} | Failed: {fail}")
    print(f"Time-series records: {total_records}")
    print(f"Region popularity records: {total_region_records}")
    print(f"Total records: {total_records + total_region_records}")
    print(f"Ended: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%SZ')}")
    print("=" * 60)

    if fail:
        exit(1)


if __name__ == "__main__":
    main()
