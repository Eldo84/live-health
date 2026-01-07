"""
Google Trends Data Collector for Disease Tracking
==================================================
This script collects Google Trends data for 20 tracked diseases and stores
it in Supabase. It runs weekly via GitHub Actions.

Data collected:
- Time-series: Last 30 days of daily interest values (0-100 scale)
- Region popularity: Country-level popularity scores (0-100 scale)

Each disease is fetched INDIVIDUALLY to get accurate normalized values
(100 = peak interest for that specific disease in the time period).
"""

import os
import time
import random
from datetime import datetime

from pytrends.request import TrendReq
from supabase import create_client, Client


# =============================================================================
# Configuration
# =============================================================================

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE = os.environ.get("SUPABASE_SERVICE_ROLE")

# The 20 diseases we track - these are search terms optimized for Google Trends
TRACKED_DISEASES = [
    "influenza",
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

# Rate limiting settings
DELAY_BETWEEN_REQUESTS = 2  # seconds between API calls
DELAY_ON_ERROR = 15  # seconds to wait after an error
MAX_RETRIES = 3  # max retries per disease


# =============================================================================
# Helper Functions
# =============================================================================

def validate_environment():
    """Ensure required environment variables are set."""
    if not SUPABASE_URL:
        raise ValueError("Missing SUPABASE_URL environment variable")
    if not SUPABASE_SERVICE_ROLE:
        raise ValueError("Missing SUPABASE_SERVICE_ROLE environment variable")
    print("✓ Environment variables validated")


def create_supabase_client() -> Client:
    """Create and return Supabase client."""
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE)


def create_pytrends_client() -> TrendReq:
    """Create and return Pytrends client with retry settings."""
    return TrendReq(
        hl="en-US",
        tz=0,  # UTC timezone
        retries=3,
        backoff_factor=0.5,
    )


# =============================================================================
# Region Name Normalization
# =============================================================================

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


# =============================================================================
# Main Collection Logic
# =============================================================================

def collect_all_data_for_disease(pytrends: TrendReq, disease: str, collection_date: str) -> tuple[list, list]:
    """
    Fetch BOTH time-series and region data for a SINGLE disease.
    Builds payload ONCE and reuses it for both queries (critical optimization).
    
    Returns:
        tuple: (time_series_records, region_records)
    """
    time_series_records = []
    region_records = []
    
    try:
        # Build payload ONCE for this disease - last 30 days
        # This is the critical optimization: one payload, two queries
        pytrends.build_payload(
            [disease],  # Single disease for accurate normalization
            timeframe="today 1-m",  # Last 30 days, daily granularity
            geo="",  # Worldwide
        )
        
        # Add jitter to avoid bot-like behavior
        time.sleep(0.5 + random.random())
        
        # Get interest over time (time-series data)
        df_time = pytrends.interest_over_time()
        
        if not df_time.empty and disease in df_time.columns:
            for date_index, row in df_time.iterrows():
                time_series_records.append({
                    "disease": disease,
                    "date": date_index.strftime("%Y-%m-%d"),
                    "interest_value": int(row[disease]),
                })
            print(f"    ✓ Collected {len(time_series_records)} time-series data points")
        else:
            print(f"    ⚠ No time-series data returned for: {disease}")
        
        # Add jitter before second query
        time.sleep(0.5 + random.random())
        
        # Get interest by region (country level) - REUSES SAME PAYLOAD
        df_region = pytrends.interest_by_region(
            resolution="COUNTRY",
            inc_low_vol=True,
            inc_geo_code=False
        )
        
        if not df_region.empty and disease in df_region.columns:
            disease_data = df_region[disease].dropna()
            
            for region, score in disease_data.items():
                # Skip if score is 0 (insufficient data)
                if score == 0:
                    continue
                
                # Normalize region name
                normalized_region = normalize_region_name(region)
                
                region_records.append({
                    "disease": disease,
                    "region": normalized_region,
                    "region_code": None,  # Could be enhanced with ISO code lookup
                    "popularity_score": int(score),
                    "date": collection_date,  # Use collection date for consistency
                })
            
            print(f"    ✓ Collected {len(region_records)} region data points")
        else:
            print(f"    ⚠ No region data returned for: {disease}")
        
    except Exception as e:
        print(f"    ✗ Error fetching data for {disease}: {e}")
        raise
    
    return time_series_records, region_records


def upload_to_supabase(supabase: Client, records: list):
    """
    Upload time-series records to Supabase using upsert (insert or update on conflict).
    """
    if not records:
        return
    
    try:
        # Upsert in batches of 100 to avoid payload size limits
        batch_size = 100
        for i in range(0, len(records), batch_size):
            batch = records[i:i + batch_size]
            supabase.table("google_trends").upsert(
                batch,
                on_conflict="disease,date"
            ).execute()
        
        print(f"    ✓ Uploaded {len(records)} time-series records to Supabase")
        
    except Exception as e:
        print(f"    ✗ Error uploading to Supabase: {e}")
        raise


def upload_region_records_to_supabase(supabase: Client, records: list):
    """
    Upload region popularity records to Supabase using upsert.
    """
    if not records:
        return
    
    try:
        # Upsert in batches of 100 to avoid payload size limits
        batch_size = 100
        for i in range(0, len(records), batch_size):
            batch = records[i:i + batch_size]
            supabase.table("google_trends_regions").upsert(
                batch,
                on_conflict="disease,region,date"
            ).execute()
        
        print(f"    ✓ Uploaded {len(records)} region records to Supabase")
        
    except Exception as e:
        print(f"    ✗ Error uploading region data to Supabase: {e}")
        raise


def collect_all_trends():
    """
    Main function: Collect Google Trends data for all 20 diseases.
    Each disease is fetched individually for accurate normalized values.
    """
    print("=" * 60)
    print("Google Trends Data Collection")
    print(f"Started at: {datetime.utcnow().isoformat()}Z")
    print("=" * 60)
    
    # Validate and initialize
    validate_environment()
    supabase = create_supabase_client()
    pytrends = create_pytrends_client()
    
    # Use collection date for region data (consistent across all diseases in this run)
    collection_date = datetime.utcnow().date().isoformat()
    
    total_records = 0
    total_region_records = 0
    successful = 0
    failed = 0
    
    print(f"\nCollecting data for {len(TRACKED_DISEASES)} diseases (individually)...")
    print(f"Collection date: {collection_date}")
    print("-" * 60)
    
    for idx, disease in enumerate(TRACKED_DISEASES, 1):
        print(f"\n[{idx}/{len(TRACKED_DISEASES)}] Processing: {disease}")
        
        retries = 0
        success = False
        
        while retries < MAX_RETRIES and not success:
            try:
                # Collect BOTH time-series and region data in one go (payload reuse)
                time_series_records, region_records = collect_all_data_for_disease(
                    pytrends, disease, collection_date
                )
                
                # Upload time-series data to Supabase
                if time_series_records:
                    upload_to_supabase(supabase, time_series_records)
                    total_records += len(time_series_records)
                
                # Upload region data to Supabase
                if region_records:
                    upload_region_records_to_supabase(supabase, region_records)
                    total_region_records += len(region_records)
                
                # Count as success if we got either time-series or region data
                if time_series_records or region_records:
                    successful += 1
                    success = True
                else:
                    # No data returned, count as success but warn
                    successful += 1
                    success = True
                
                # Rate limiting - be respectful to Google
                if idx < len(TRACKED_DISEASES):
                    # Add jitter to base delay to avoid bot-like patterns
                    delay = DELAY_BETWEEN_REQUESTS + random.random()
                    print(f"    Waiting {delay:.1f}s...")
                    time.sleep(delay)
                    
            except Exception as e:
                retries += 1
                if retries < MAX_RETRIES:
                    print(f"    ⚠ Retry {retries}/{MAX_RETRIES} after error: {e}")
                    time.sleep(DELAY_ON_ERROR)
                    # Recreate pytrends client to reset session
                    pytrends = create_pytrends_client()
                else:
                    print(f"    ✗ Failed after {MAX_RETRIES} retries")
                    failed += 1
    
    # Summary
    print("\n" + "=" * 60)
    print("Collection Complete!")
    print(f"Successful: {successful}/{len(TRACKED_DISEASES)} diseases")
    print(f"Failed: {failed}/{len(TRACKED_DISEASES)} diseases")
    print(f"Time-series records uploaded: {total_records}")
    print(f"Region records uploaded: {total_region_records}")
    print(f"Total records uploaded: {total_records + total_region_records}")
    print(f"Finished at: {datetime.utcnow().isoformat()}Z")
    print("=" * 60)
    
    # Exit with error code only if everything failed (partial success is acceptable)
    # This prevents GitHub Actions from marking runs as failed when only a few diseases fail
    if successful == 0:
        print("\n⚠ CRITICAL: All diseases failed to collect data!")
        exit(1)
    elif failed > 0:
        print(f"\n⚠ Warning: {failed} disease(s) failed, but {successful} succeeded")


# =============================================================================
# Entry Point
# =============================================================================

if __name__ == "__main__":
    collect_all_trends()
