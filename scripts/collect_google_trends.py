"""
Google Trends Data Collector for Disease Tracking
==================================================
This script collects Google Trends data for 21 tracked diseases and stores
it in Supabase. It runs weekly via GitHub Actions.

Data collected:
- Time-series: Last 30 days of daily interest values (0-100 scale)
- Region popularity: Country-level popularity scores (0-100 scale)

Query Modes:
1. Individual Mode (QUERY_MODE="individual"): Each disease queried separately
   - Pros: Accurate per-disease normalization (100 = peak for that disease)
   - Cons: Not directly comparable across diseases
   
2. Comparative Mode (QUERY_MODE="comparative"): Diseases queried in batches
   - Pros: Data normalized on same scale, matches Google Trends website
   - Cons: Limited to 5 diseases per batch (Google's limit)

Improvements for Data Accuracy (Matching Google Trends Website):
- Fix #1: Comparative batch queries option for matching Google's normalization
- Fix #2: Exclude last 2-3 days to handle partial data correctly
- Fix #3: Pacific Time (UTC-8) timezone to match Google Trends
- Fix #4: Keep zero values as valid data points (don't exclude them)
- Fix #5: Data validation to detect suspicious API responses
- Enhanced rate limiting (10s delays, 10 retries) to reduce 429 errors
- Configurable low-volume region handling (INCLUDE_LOW_VOLUME_REGIONS=False by default)
- Diagnostic logging for development/debugging (ENABLE_DIAGNOSTIC_LOGGING)

Configuration:
- QUERY_MODE: "individual" or "comparative" (default: "individual")
- EXCLUDE_PARTIAL_DATA: True (recommended) - excludes recent partial days
- EXCLUDE_RECENT_DAYS: 3 - number of recent days to exclude
- INCLUDE_LOW_VOLUME_REGIONS: False (matches Google's default behavior)
"""

import os
import time
import random
from datetime import datetime, timedelta

from pytrends.request import TrendReq
from supabase import create_client, Client


# =============================================================================
# Configuration
# =============================================================================

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE = os.environ.get("SUPABASE_SERVICE_ROLE")

# The 21 diseases we track - these are search terms optimized for Google Trends
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

# Rate limiting settings - increased significantly to avoid 429 errors
# Google Trends has strict rate limits, especially for automated requests
DELAY_BETWEEN_REQUESTS = 60  # seconds between API calls (increased from 10 to 60)
DELAY_ON_ERROR = 60  # seconds to wait after a non-rate-limit error
DELAY_ON_RATE_LIMIT = 300  # seconds (5 minutes) to wait after rate limit error
MAX_RETRIES = 5  # max retries per disease (reduced from 10 to avoid long runs)
EXPONENTIAL_BACKOFF = True  # Use exponential backoff for rate limit errors

# Query mode: "individual" or "comparative"
# - "individual": Each disease queried separately (current approach)
#   - Pros: Accurate per-disease normalization (100 = peak for that disease)
#   - Cons: Not directly comparable across diseases
# - "comparative": Diseases queried in batches (matches Google Trends website)
#   - Pros: Data normalized on same scale, comparable across diseases
#   - Cons: Loses per-disease granularity, limited to 5 diseases per query
QUERY_MODE = "individual"  # Options: "individual" or "comparative"
BATCH_SIZE = 5  # For comparative mode: Google Trends limit per query

# Low-volume disease handling
# Set to False to match Google's default behavior (excludes low-volume regions)
INCLUDE_LOW_VOLUME_REGIONS = False  # Changed to False to match Google's default

# Partial data handling
# Set to True to exclude partial recent days (recommended for consistency)
EXCLUDE_PARTIAL_DATA = True  # Changed to True - exclude last 2-3 days
EXCLUDE_RECENT_DAYS = 3  # Number of recent days to exclude (handles partial data)

# Diagnostic logging (set to True for development/debugging)
ENABLE_DIAGNOSTIC_LOGGING = False  # Set to True to log raw dataframes


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
    # Use Pacific Time (UTC-8 = -480 minutes) to match Google Trends website
    # Note: This doesn't account for DST, but Google Trends uses Pacific Time
    return TrendReq(
        hl="en-US",
        tz=-480,  # Pacific Time (UTC-8) to match Google Trends website
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
# Data Validation
# =============================================================================

def validate_data_quality(time_series_records: list, region_records: list, disease: str) -> bool:
    """
    Detect suspicious data that indicates API issues.
    
    Returns:
        bool: True if data quality looks good, False if suspicious
    """
    issues = []
    
    # Check if ALL time-series values are 0 (suspicious)
    if time_series_records:
        all_zero = all(r['interest_value'] == 0 for r in time_series_records)
        if all_zero:
            issues.append(f"All time-series values are 0")
    
    # Check if we got way fewer regions than expected
    if len(region_records) < 10:
        issues.append(f"Only {len(region_records)} regions (expected more)")
    
    if issues:
        print(f"    ⚠ WARNING: Data quality issues for {disease}: {', '.join(issues)}")
        return False
    
    return True


# =============================================================================
# Main Collection Logic
# =============================================================================

def collect_data_for_batch(pytrends: TrendReq, diseases: list[str], collection_date: str) -> tuple[dict[str, list], dict[str, list]]:
    """
    Fetch data for multiple diseases in a batch (comparative mode).
    All diseases are normalized on the SAME scale, matching Google Trends website.
    
    Returns:
        tuple: (time_series_dict, region_dict) where keys are disease names
    """
    time_series_dict = {disease: [] for disease in diseases}
    region_dict = {disease: [] for disease in diseases}
    
    try:
        # Build payload for all diseases in batch
        pytrends.build_payload(
            diseases,  # Multiple diseases for comparable normalization
            timeframe="today 1-m",
            geo="",
        )
        
        # Add jitter to avoid bot-like behavior
        time.sleep(0.5 + random.random())
        
        # Get interest over time (time-series data)
        df_time = pytrends.interest_over_time()
        
        # Diagnostic logging
        if ENABLE_DIAGNOSTIC_LOGGING and not df_time.empty:
            print(f"    [DEBUG] Raw time-series data for batch {diseases}:")
            print(f"    {df_time.to_string()}")
        
        if not df_time.empty:
            # Calculate cutoff date for excluding recent days
            cutoff_date = None
            if EXCLUDE_PARTIAL_DATA:
                cutoff_date = datetime.utcnow().date() - timedelta(days=EXCLUDE_RECENT_DAYS)
            
            for date_index, row in df_time.iterrows():
                date_obj = date_index.date() if hasattr(date_index, 'date') else datetime.fromtimestamp(date_index.timestamp()).date()
                
                # Exclude recent days if configured
                if cutoff_date and date_obj > cutoff_date:
                    continue
                
                # Check if this is partial data
                is_partial = False
                if 'isPartial' in row:
                    is_partial = bool(row['isPartial'])
                    if EXCLUDE_PARTIAL_DATA and is_partial:
                        continue
                
                # Extract data for each disease in the batch
                for disease in diseases:
                    if disease in df_time.columns:
                        interest_value = int(row[disease])
                        time_series_dict[disease].append({
                            "disease": disease,
                            "date": date_obj.isoformat(),
                            "interest_value": interest_value,
                        })
            
            for disease in diseases:
                count = len(time_series_dict[disease])
                if count > 0:
                    print(f"    ✓ Collected {count} time-series data points for {disease}")
        
        # Add jitter before second query
        time.sleep(0.5 + random.random())
        
        # Get interest by region (country level)
        df_region = pytrends.interest_by_region(
            resolution="COUNTRY",
            inc_low_vol=INCLUDE_LOW_VOLUME_REGIONS,
            inc_geo_code=False
        )
        
        # Diagnostic logging
        if ENABLE_DIAGNOSTIC_LOGGING and not df_region.empty:
            print(f"    [DEBUG] Raw region data for batch {diseases}:")
            print(f"    {df_region.to_string()}")
        
        if not df_region.empty:
            for disease in diseases:
                if disease in df_region.columns:
                    disease_data = df_region[disease].dropna()
                    
                    for region, score in disease_data.items():
                        # Keep zeros as valid data points
                        normalized_region = normalize_region_name(region)
                        
                        region_dict[disease].append({
                            "disease": disease,
                            "region": normalized_region,
                            "region_code": None,
                            "popularity_score": int(score),
                            "date": collection_date,
                        })
                    
                    count = len(region_dict[disease])
                    if count > 0:
                        print(f"    ✓ Collected {count} region data points for {disease}")
        
    except Exception as e:
        print(f"    ✗ Error fetching batch data for {diseases}: {e}")
        raise
    
    # Validate data quality for each disease
    for disease in diseases:
        validate_data_quality(time_series_dict[disease], region_dict[disease], disease)
    
    return time_series_dict, region_dict


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
        
        # Diagnostic logging
        if ENABLE_DIAGNOSTIC_LOGGING and not df_time.empty:
            print(f"    [DEBUG] Raw time-series data for {disease}:")
            print(f"    {df_time.to_string()}")
        
        if not df_time.empty and disease in df_time.columns:
            partial_count = 0
            zero_count = 0
            excluded_recent = 0
            
            # Calculate cutoff date for excluding recent days
            cutoff_date = None
            if EXCLUDE_PARTIAL_DATA:
                cutoff_date = datetime.utcnow().date() - timedelta(days=EXCLUDE_RECENT_DAYS)
            
            for date_index, row in df_time.iterrows():
                date_obj = date_index.date() if hasattr(date_index, 'date') else datetime.fromtimestamp(date_index.timestamp()).date()
                
                # Check if this is partial data (recent days may be incomplete)
                is_partial = False
                if 'isPartial' in row:
                    is_partial = bool(row['isPartial'])
                    if is_partial:
                        partial_count += 1
                
                # Exclude recent days if configured (handles partial data)
                if cutoff_date and date_obj > cutoff_date:
                    excluded_recent += 1
                    continue
                
                # Skip partial data if configured to do so
                if EXCLUDE_PARTIAL_DATA and is_partial:
                    continue
                
                interest_value = int(row[disease])
                
                # Track zero values for diagnostic purposes
                if interest_value == 0:
                    zero_count += 1
                
                time_series_records.append({
                    "disease": disease,
                    "date": date_obj.isoformat(),
                    "interest_value": interest_value,
                })
            
            info_msg = f"    ✓ Collected {len(time_series_records)} time-series data points"
            if excluded_recent > 0:
                info_msg += f" ({excluded_recent} recent days excluded)"
            if partial_count > 0:
                info_msg += f" ({partial_count} partial days {'excluded' if EXCLUDE_PARTIAL_DATA else 'included'})"
            if zero_count > 0:
                info_msg += f" ({zero_count} days with 0/<1 interest)"
            print(info_msg)
        else:
            print(f"    ⚠ No time-series data returned for: {disease}")
        
        # Add jitter before second query
        time.sleep(0.5 + random.random())
        
        # Get interest by region (country level) - REUSES SAME PAYLOAD
        # Use INCLUDE_LOW_VOLUME_REGIONS setting to match Google Trends website behavior
        # For low-volume terms like "ebola", True may show more regions matching the website
        df_region = pytrends.interest_by_region(
            resolution="COUNTRY",
            inc_low_vol=INCLUDE_LOW_VOLUME_REGIONS,
            inc_geo_code=False
        )
        
        # Diagnostic logging
        if ENABLE_DIAGNOSTIC_LOGGING and not df_region.empty:
            print(f"    [DEBUG] Raw region data for {disease}:")
            print(f"    {df_region.to_string()}")
        
        if not df_region.empty and disease in df_region.columns:
            disease_data = df_region[disease].dropna()
            
            for region, score in disease_data.items():
                # Keep zeros as valid data points (Fix #4)
                # Google Trends shows 0 as valid data, so we should too
                # Only exclude if INCLUDE_LOW_VOLUME_REGIONS is False AND score is 0
                # But actually, we should keep all scores including 0
                
                # Normalize region name
                normalized_region = normalize_region_name(region)
                
                region_records.append({
                    "disease": disease,
                    "region": normalized_region,
                    "region_code": None,  # Could be enhanced with ISO code lookup
                    "popularity_score": int(score),  # Keep 0 values as valid data
                    "date": collection_date,  # Use collection date for consistency
                })
            
            print(f"    ✓ Collected {len(region_records)} region data points (including zeros)")
        else:
            print(f"    ⚠ No region data returned for: {disease}")
        
    except Exception as e:
        print(f"    ✗ Error fetching data for {disease}: {e}")
        raise
    
    # Validate data quality (Fix #5)
    validate_data_quality(time_series_records, region_records, disease)
    
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
    
    mode_label = "comparative (batched)" if QUERY_MODE == "comparative" else "individual"
    print(f"\nCollecting data for {len(TRACKED_DISEASES)} diseases ({mode_label})...")
    print(f"Collection date: {collection_date}")
    print(f"Configuration:")
    print(f"  - Query mode: {QUERY_MODE}")
    if QUERY_MODE == "comparative":
        print(f"  - Batch size: {BATCH_SIZE}")
    print(f"  - Delay between requests: {DELAY_BETWEEN_REQUESTS}s")
    print(f"  - Delay on error: {DELAY_ON_ERROR}s")
    print(f"  - Delay on rate limit: {DELAY_ON_RATE_LIMIT}s ({DELAY_ON_RATE_LIMIT/60:.1f} minutes)")
    print(f"  - Max retries: {MAX_RETRIES}")
    print(f"  - Exponential backoff: {EXPONENTIAL_BACKOFF}")
    print(f"  - Include low-volume regions: {INCLUDE_LOW_VOLUME_REGIONS}")
    print(f"  - Exclude partial data: {EXCLUDE_PARTIAL_DATA}")
    if EXCLUDE_PARTIAL_DATA:
        print(f"  - Exclude recent days: {EXCLUDE_RECENT_DAYS}")
    print(f"  - Diagnostic logging: {ENABLE_DIAGNOSTIC_LOGGING}")
    print("-" * 60)
    
    if QUERY_MODE == "comparative":
        # Batch mode: Query diseases in groups for comparable normalization
        batch_num = 0
        for i in range(0, len(TRACKED_DISEASES), BATCH_SIZE):
            batch = TRACKED_DISEASES[i:i + BATCH_SIZE]
            batch_num += 1
            print(f"\n[Batch {batch_num}] Processing: {', '.join(batch)}")
            
            retries = 0
            success = False
            
            while retries < MAX_RETRIES and not success:
                try:
                    # Collect data for entire batch
                    time_series_dict, region_dict = collect_data_for_batch(
                        pytrends, batch, collection_date
                    )
                    
                    # Upload data for each disease in batch
                    batch_success = 0
                    for disease in batch:
                        time_series_records = time_series_dict.get(disease, [])
                        region_records = region_dict.get(disease, [])
                        
                        if time_series_records:
                            upload_to_supabase(supabase, time_series_records)
                            total_records += len(time_series_records)
                        
                        if region_records:
                            upload_region_records_to_supabase(supabase, region_records)
                            total_region_records += len(region_records)
                        
                        if time_series_records or region_records:
                            batch_success += 1
                            successful += 1
                    
                    if batch_success > 0:
                        success = True
                    else:
                        # No data for any disease in batch
                        print(f"    ⚠ No data returned for batch")
                        success = True  # Don't retry if no data (might be legitimate)
                    
                    # Rate limiting between batches
                    if i + BATCH_SIZE < len(TRACKED_DISEASES):
                        delay = DELAY_BETWEEN_REQUESTS + random.random()
                        print(f"    Waiting {delay:.1f}s before next batch...")
                        time.sleep(delay)
                    
                except Exception as e:
                    retries += 1
                    error_type = type(e).__name__
                    error_msg = str(e)
                    
                    # Check for rate limiting (429 errors)
                    is_rate_limit = "429" in error_msg or "rate limit" in error_msg.lower() or "too many requests" in error_msg.lower()
                    
                    if retries < MAX_RETRIES:
                        if is_rate_limit:
                            # Exponential backoff for rate limits: 5min, 10min, 20min, etc.
                            delay = DELAY_ON_RATE_LIMIT * (2 ** (retries - 1))
                            print(f"    ⚠ Retry {retries}/{MAX_RETRIES} after {error_type}: {error_msg}")
                            print(f"    ⚠ Rate limit detected - waiting {delay}s ({delay/60:.1f} minutes) before retry...")
                        else:
                            delay = DELAY_ON_ERROR
                            print(f"    ⚠ Retry {retries}/{MAX_RETRIES} after {error_type}: {error_msg}")
                        time.sleep(delay)
                        pytrends = create_pytrends_client()
                    else:
                        print(f"    ✗ Failed after {MAX_RETRIES} retries ({error_type}: {error_msg})")
                        failed += len(batch)
    
    else:
        # Individual mode: Query each disease separately (original approach)
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
                    error_type = type(e).__name__
                    error_msg = str(e)
                    
                    # Check for rate limiting (429 errors)
                    is_rate_limit = "429" in error_msg or "rate limit" in error_msg.lower() or "too many requests" in error_msg.lower()
                    
                    if retries < MAX_RETRIES:
                        if is_rate_limit:
                            # Exponential backoff for rate limits: 5min, 10min, 20min, etc.
                            delay = DELAY_ON_RATE_LIMIT * (2 ** (retries - 1))
                            print(f"    ⚠ Retry {retries}/{MAX_RETRIES} after {error_type}: {error_msg}")
                            print(f"    ⚠ Rate limit detected - waiting {delay}s ({delay/60:.1f} minutes) before retry...")
                        else:
                            delay = DELAY_ON_ERROR
                            print(f"    ⚠ Retry {retries}/{MAX_RETRIES} after {error_type}: {error_msg}")
                        time.sleep(delay)
                        # Recreate pytrends client to reset session
                        pytrends = create_pytrends_client()
                    else:
                        print(f"    ✗ Failed after {MAX_RETRIES} retries ({error_type}: {error_msg})")
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
