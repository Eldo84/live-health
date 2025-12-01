"""
Google Trends Data Collector for Disease Tracking
==================================================
This script collects Google Trends data for 20 tracked diseases and stores
it in Supabase. It runs weekly via GitHub Actions.

Data collected: Last 30 days of daily interest values (0-100 scale)

Each disease is fetched INDIVIDUALLY to get accurate normalized values
(100 = peak interest for that specific disease in the time period).
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
# Main Collection Logic
# =============================================================================

def collect_trends_for_disease(pytrends: TrendReq, disease: str) -> list:
    """
    Fetch Google Trends data for a SINGLE disease.
    This ensures each disease gets its own normalized 0-100 scale.
    Returns list of records ready for database insertion.
    """
    records = []
    
    try:
        # Build payload for single disease - last 30 days
        pytrends.build_payload(
            [disease],  # Single disease for accurate normalization
            timeframe="today 1-m",  # Last 30 days, daily granularity
            geo="",  # Worldwide
        )
        
        # Get interest over time
        df = pytrends.interest_over_time()
        
        if df.empty:
            print(f"    ⚠ No data returned for: {disease}")
            return records
        
        # Process the disease data
        if disease not in df.columns:
            print(f"    ⚠ No column for: {disease}")
            return records
        
        for date_index, row in df.iterrows():
            records.append({
                "disease": disease,
                "date": date_index.strftime("%Y-%m-%d"),
                "interest_value": int(row[disease]),
            })
        
        print(f"    ✓ Collected {len(records)} data points")
        
    except Exception as e:
        print(f"    ✗ Error fetching trends: {e}")
        raise
    
    return records


def upload_to_supabase(supabase: Client, records: list):
    """
    Upload records to Supabase using upsert (insert or update on conflict).
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
        
        print(f"    ✓ Uploaded {len(records)} records to Supabase")
        
    except Exception as e:
        print(f"    ✗ Error uploading to Supabase: {e}")
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
    
    total_records = 0
    successful = 0
    failed = 0
    
    print(f"\nCollecting data for {len(TRACKED_DISEASES)} diseases (individually)...")
    print("-" * 60)
    
    for idx, disease in enumerate(TRACKED_DISEASES, 1):
        print(f"\n[{idx}/{len(TRACKED_DISEASES)}] Processing: {disease}")
        
        retries = 0
        success = False
        
        while retries < MAX_RETRIES and not success:
            try:
                # Collect trends for this disease
                records = collect_trends_for_disease(pytrends, disease)
                
                # Upload to Supabase
                if records:
                    upload_to_supabase(supabase, records)
                    total_records += len(records)
                    successful += 1
                    success = True
                else:
                    # No data returned, count as success but warn
                    successful += 1
                    success = True
                
                # Rate limiting - be respectful to Google
                if idx < len(TRACKED_DISEASES):
                    print(f"    Waiting {DELAY_BETWEEN_REQUESTS}s...")
                    time.sleep(DELAY_BETWEEN_REQUESTS)
                    
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
    print(f"Total records uploaded: {total_records}")
    print(f"Finished at: {datetime.utcnow().isoformat()}Z")
    print("=" * 60)
    
    # Exit with error code if any failed
    if failed > 0:
        exit(1)


# =============================================================================
# Entry Point
# =============================================================================

if __name__ == "__main__":
    collect_all_trends()
