"""
Diagnostic script to test Google Trends time-series data
========================================================
This script tests how Google Trends API normalizes time-series data when:
1. Fetching diseases in groups (current approach)
2. Fetching diseases together (Google Trends website approach)

This will help identify any mismatches in the time-series chart.
"""

import os
import sys
from datetime import datetime, timedelta
from pytrends.request import TrendReq
from supabase import create_client, Client

# Test diseases from user's example
TEST_DISEASES = ["covid", "ebola", "measles"]

def test_grouped_fetch():
    """Test fetching diseases together (like Google Trends website)"""
    print("=" * 80)
    print("TEST 1: Grouped Fetch - Time Series Data")
    print("=" * 80)
    print(f"Fetching: {TEST_DISEASES}")
    print(f"Timeframe: today 1-m (last month)")
    print()
    
    pytrends = TrendReq(hl="en-US", tz=0, retries=3, backoff_factor=0.5)
    
    try:
        # Build payload with all 3 diseases together
        pytrends.build_payload(TEST_DISEASES, timeframe="today 1-m", geo="")
        
        # Fetch time-series data
        df = pytrends.interest_over_time()
        
        if df.empty:
            print("❌ No data returned")
            return None
        
        print(f"✅ Got data for {len(df)} time points")
        print(f"Date range: {df.index[0]} to {df.index[-1]}")
        print()
        
        results = {}
        
        for disease in TEST_DISEASES:
            if disease not in df.columns:
                print(f"⚠️  {disease} not in results")
                continue
            
            disease_data = df[disease].dropna()
            results[disease] = disease_data.to_dict()
            
            # Show statistics
            print(f"{disease.upper()}:")
            print(f"  Total data points: {len(disease_data)}")
            print(f"  Min value: {int(disease_data.min())}")
            print(f"  Max value: {int(disease_data.max())}")
            print(f"  Mean value: {disease_data.mean():.1f}")
            print(f"  Recent values (last 7 days):")
            
            # Show last 7 days
            last_7 = disease_data.tail(7)
            for date, value in last_7.items():
                print(f"    {date.strftime('%Y-%m-%d')}: {int(value)}")
            print()
        
        # Check if values are normalized (should have max = 100 for at least one disease)
        print("Normalization check:")
        print("-" * 80)
        for disease in TEST_DISEASES:
            if disease in results:
                max_val = max(results[disease].values())
                has_100 = max_val == 100
                print(f"  {disease}: max = {int(max_val)}, has 100 = {has_100}")
        
        return results
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return None


def test_individual_fetches():
    """Test fetching each disease individually"""
    print("\n" + "=" * 80)
    print("TEST 2: Individual Fetches (One at a time)")
    print("=" * 80)
    print()
    
    pytrends = TrendReq(hl="en-US", tz=0, retries=3, backoff_factor=0.5)
    
    results = {}
    
    for disease in TEST_DISEASES:
        print(f"Fetching {disease}...")
        try:
            pytrends.build_payload([disease], timeframe="today 1-m", geo="")
            df = pytrends.interest_over_time()
            
            if df.empty or disease not in df.columns:
                print(f"  ⚠️  No data for {disease}")
                continue
            
            disease_data = df[disease].dropna()
            results[disease] = disease_data.to_dict()
            
            max_val = int(disease_data.max())
            print(f"  ✅ Got {len(disease_data)} data points, max = {max_val}")
            
        except Exception as e:
            print(f"  ❌ Error: {e}")
    
    return results


def check_stored_data():
    """Check what we have stored in the database"""
    print("\n" + "=" * 80)
    print("TEST 3: Stored Data in Database")
    print("=" * 80)
    print()
    
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_SERVICE_ROLE = os.environ.get("SUPABASE_SERVICE_ROLE")
    
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE:
        print("⚠️  Supabase credentials not set. Skipping database check.")
        return None
    
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE)
        
        # Get time-series data for test diseases
        response = supabase.rpc(
            "get_disease_trends",
            {
                "disease_names": TEST_DISEASES
            }
        ).execute()
        
        if not response.data:
            print("❌ No data in database")
            return None
        
        print(f"✅ Found {len(response.data)} records in database")
        print()
        
        # Group by disease
        from collections import defaultdict
        by_disease = defaultdict(list)
        
        for row in response.data:
            by_disease[row['disease']].append({
                'date': row['date'],
                'interest_value': row['interest_value']
            })
        
        results = {}
        for disease in TEST_DISEASES:
            if disease not in by_disease:
                print(f"⚠️  {disease} not in database")
                continue
            
            data_points = sorted(by_disease[disease], key=lambda x: x['date'])
            results[disease] = {dp['date']: dp['interest_value'] for dp in data_points}
            
            values = [dp['interest_value'] for dp in data_points]
            print(f"{disease.upper()}:")
            print(f"  Total data points: {len(data_points)}")
            print(f"  Date range: {data_points[0]['date']} to {data_points[-1]['date']}")
            print(f"  Min value: {min(values)}")
            print(f"  Max value: {max(values)}")
            print(f"  Mean value: {sum(values) / len(values):.1f}")
            print(f"  Recent values (last 7):")
            for dp in data_points[-7:]:
                print(f"    {dp['date']}: {dp['interest_value']}")
            print()
        
        return results
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return None


def compare_results(grouped_results, individual_results, stored_results):
    """Compare the three approaches"""
    print("\n" + "=" * 80)
    print("COMPARISON: Grouped vs Individual vs Stored")
    print("=" * 80)
    print()
    
    if not grouped_results:
        print("⚠️  Cannot compare - no grouped results")
        return
    
    for disease in TEST_DISEASES:
        if disease not in grouped_results:
            continue
        
        print(f"\n{disease.upper()}:")
        print("-" * 80)
        
        grouped = grouped_results.get(disease, {})
        individual = individual_results.get(disease, {})
        stored = stored_results.get(disease, {}) if stored_results else {}
        
        # Compare max values
        grouped_max = max(grouped.values()) if grouped else 0
        individual_max = max(individual.values()) if individual else 0
        stored_max = max(stored.values()) if stored else 0
        
        print(f"Max values:")
        print(f"  Grouped (API together):   {int(grouped_max)}")
        print(f"  Individual (API alone):  {int(individual_max)}")
        print(f"  Stored (database):       {int(stored_max)}")
        
        # Check if they match
        if grouped_max == stored_max:
            print(f"  ✅ Grouped matches stored")
        else:
            print(f"  ❌ MISMATCH: Grouped ({int(grouped_max)}) != Stored ({int(stored_max)})")
        
        if individual_max == stored_max:
            print(f"  ✅ Individual matches stored")
        else:
            print(f"  ❌ MISMATCH: Individual ({int(individual_max)}) != Stored ({int(stored_max)})")
        
        # Compare recent values
        if grouped and stored:
            print(f"\nRecent values comparison (last 5 days):")
            grouped_sorted = sorted(grouped.items(), key=lambda x: x[0])[-5:]
            stored_sorted = sorted(stored.items(), key=lambda x: x[0])[-5:]
            
            print(f"{'Date':<12} {'Grouped':<10} {'Stored':<10} {'Match':<10}")
            print("-" * 50)
            
            # Match by date
            for date_key, grouped_val in grouped_sorted[-5:]:
                date_str = date_key.strftime('%Y-%m-%d') if hasattr(date_key, 'strftime') else str(date_key)
                stored_val = stored.get(date_str, stored.get(str(date_key), 'N/A'))
                
                match = "✅" if (isinstance(stored_val, (int, float)) and abs(grouped_val - stored_val) <= 1) else "❌"
                print(f"{date_str:<12} {int(grouped_val):<10} {str(stored_val):<10} {match:<10}")


def main():
    print("\n" + "=" * 80)
    print("Google Trends Time-Series Data Diagnostic")
    print("=" * 80)
    print(f"Testing diseases: {', '.join(TEST_DISEASES)}")
    print(f"Timeframe: today 1-m (last month)")
    print()
    
    # Test 1: Grouped fetch (what Google Trends website does)
    grouped_results = test_grouped_fetch()
    
    # Test 2: Individual fetches
    individual_results = test_individual_fetches()
    
    # Test 3: Check stored data
    stored_results = check_stored_data()
    
    # Compare
    compare_results(grouped_results, individual_results, stored_results)
    
    print("\n" + "=" * 80)
    print("ANALYSIS")
    print("=" * 80)
    print()
    print("Key Questions:")
    print("1. Do grouped results match stored data? (Should be YES if fetched together)")
    print("2. Do individual results differ from grouped? (Likely YES - different normalization)")
    print("3. Are max values 100? (Should be YES for at least one disease in grouped fetch)")
    print()
    print("Expected Behavior:")
    print("- Google Trends website: Fetches all selected terms together → proper normalization")
    print("- Our app (current): Fetches in groups of 5 → normalization within each group")
    print("- Problem: When comparing diseases from different groups, scores are incomparable")
    print()


if __name__ == "__main__":
    main()

