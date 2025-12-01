"""
Google Trends Data Collector for Disease Tracking
==================================================
This script collects Google Trends data for 20 tracked diseases and stores
it in Supabase. It runs weekly via GitHub Actions.

Data collected: Last 30 days of daily interest values (0-100 scale)
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
DELAY_BETWEEN_REQUESTS = 3  # seconds between API calls
DELAY_ON_ERROR = 10  # seconds to wait after an error


# =============================================================================
# Helper Functions
# =============================================================================

def chunk_list(lst: list, size: int) -> list:
    """Split a list into chunks of specified size."""
    return [lst[i:i + size] for i in range(0, len(lst), size)]


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

def collect_trends_for_group(pytrends: TrendReq, diseases: list) -> list:
    """
    Fetch Google Trends data for a group of up to 5 diseases.
    Returns list of records ready for database insertion.
    """
    records = []
    
    try:
        # Build payload for this group - last 30 days
        pytrends.build_payload(
            diseases,
            timeframe="today 1-m",  # Last 30 days, daily granularity
            geo="",  # Worldwide
        )
        
        # Get interest over time
        df = pytrends.interest_over_time()
        
        if df.empty:
            print(f"    ⚠ No data returned for: {diseases}")
            return records
        
        # Process each disease in the group
        for disease in diseases:
            if disease not in df.columns:
                print(f"    ⚠ No column for: {disease}")
                continue
            
            for date_index, row in df.iterrows():
                # Skip the 'isPartial' column if present
                if hasattr(row, 'isPartial'):
                    pass
                    
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
    """
    print("=" * 60)
    print("Google Trends Data Collection")
    print(f"Started at: {datetime.utcnow().isoformat()}Z")
    print("=" * 60)
    
    # Validate and initialize
    validate_environment()
    supabase = create_supabase_client()
    pytrends = create_pytrends_client()
    
    # Split diseases into groups of 5 (Google Trends limit)
    disease_groups = chunk_list(TRACKED_DISEASES, 5)
    total_records = 0
    
    print(f"\nCollecting data for {len(TRACKED_DISEASES)} diseases in {len(disease_groups)} groups...")
    print("-" * 60)
    
    for group_num, group in enumerate(disease_groups, 1):
        print(f"\n[{group_num}/{len(disease_groups)}] Processing: {group}")
        
        try:
            # Collect trends for this group
            records = collect_trends_for_group(pytrends, group)
            
            # Upload to Supabase
            if records:
                upload_to_supabase(supabase, records)
                total_records += len(records)
            
            # Rate limiting - be respectful to Google
            if group_num < len(disease_groups):
                print(f"    Waiting {DELAY_BETWEEN_REQUESTS}s before next request...")
                time.sleep(DELAY_BETWEEN_REQUESTS)
                
        except Exception as e:
            print(f"    ✗ Failed to process group: {e}")
            print(f"    Waiting {DELAY_ON_ERROR}s before continuing...")
            time.sleep(DELAY_ON_ERROR)
            continue
    
    # Summary
    print("\n" + "=" * 60)
    print("Collection Complete!")
    print(f"Total records uploaded: {total_records}")
    print(f"Finished at: {datetime.utcnow().isoformat()}Z")
    print("=" * 60)


# =============================================================================
# Entry Point
# =============================================================================

if __name__ == "__main__":
    collect_all_trends()

