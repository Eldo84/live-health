"""
Diagnostic script to understand Google Trends normalization behavior
===================================================================
This script tests how Google Trends API normalizes region data when:
1. Fetching diseases in groups (current approach)
2. Fetching diseases together (Google Trends website approach)

This will help identify why our app shows different rankings than Google Trends website.
"""

import os
import sys
from datetime import datetime
from pytrends.request import TrendReq
from supabase import create_client, Client

# Test diseases from user's example
TEST_DISEASES = ["covid", "ebola", "measles"]

def test_grouped_fetch():
    """Test fetching diseases in groups (current approach)"""
    print("=" * 80)
    print("TEST 1: Grouped Fetch (Current Approach)")
    print("=" * 80)
    print(f"Fetching: {TEST_DISEASES}")
    print()
    
    pytrends = TrendReq(hl="en-US", tz=0, retries=3, backoff_factor=0.5)
    
    try:
        # Build payload with all 3 diseases together
        pytrends.build_payload(TEST_DISEASES, timeframe="today 1-m", geo="")
        
        # Fetch region data
        df = pytrends.interest_by_region(
            resolution="COUNTRY", 
            inc_low_vol=True, 
            inc_geo_code=False
        )
        
        if df.empty:
            print("❌ No data returned")
            return None
        
        print(f"✅ Got data for {len(df)} regions")
        print()
        print("Top 10 regions by score (for each disease):")
        print("-" * 80)
        
        results = {}
        for disease in TEST_DISEASES:
            if disease not in df.columns:
                print(f"⚠️  {disease} not in results")
                continue
            
            disease_data = df[disease].dropna().sort_values(ascending=False)
            top_10 = disease_data.head(10)
            
            results[disease] = disease_data.to_dict()  # Store ALL data, not just top 10
            
            print(f"\n{disease.upper()}:")
            for i, (region, score) in enumerate(top_10.items(), 1):
                print(f"  {i:2d}. {region:30s} = {int(score):3d}")
        
        # Check what Google Trends website shows
        print("\n" + "=" * 80)
        print("Checking regions that Google Trends website shows:")
        print("=" * 80)
        website_regions = ["France", "St. Helena", "Greece", "Ireland", "Spain"]
        
        for disease in TEST_DISEASES:
            if disease not in df.columns:
                continue
            disease_data = df[disease].dropna()
            print(f"\n{disease.upper()} scores for website regions:")
            for region in website_regions:
                # Try exact match and variations
                score = None
                for col in df.index:
                    if region.lower() in str(col).lower() or str(col).lower() in region.lower():
                        score = disease_data.get(col, None)
                        if score is not None:
                            print(f"  {region:20s} = {int(score):3d} (matched: {col})")
                            break
                if score is None:
                    print(f"  {region:20s} = NOT FOUND")
        
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
            df = pytrends.interest_by_region(
                resolution="COUNTRY", 
                inc_low_vol=True, 
                inc_geo_code=False
            )
            
            if df.empty or disease not in df.columns:
                print(f"  ⚠️  No data for {disease}")
                continue
            
            disease_data = df[disease].dropna().sort_values(ascending=False)
            top_10 = disease_data.head(10)
            results[disease] = top_10.to_dict()
            
            print(f"  ✅ Got {len(disease_data)} regions")
            print(f"  Top region: {top_10.index[0]} = {int(top_10.iloc[0])}")
            
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
        
        # Get latest region data for test diseases
        response = supabase.rpc(
            "get_latest_disease_trends_regions",
            {
                "disease_names": TEST_DISEASES,
                "days_back": 30
            }
        ).execute()
        
        if not response.data:
            print("❌ No data in database")
            return None
        
        print(f"✅ Found {len(response.data)} records in database")
        print()
        
        # Group by disease and show top regions
        from collections import defaultdict
        by_disease = defaultdict(list)
        
        for row in response.data:
            by_disease[row['disease']].append({
                'region': row['region'],
                'score': row['popularity_score']
            })
        
        results = {}
        for disease in TEST_DISEASES:
            if disease not in by_disease:
                print(f"⚠️  {disease} not in database")
                continue
            
            regions = sorted(by_disease[disease], key=lambda x: x['score'], reverse=True)
            top_10 = regions[:10]
            
            results[disease] = {r['region']: r['score'] for r in top_10}
            
            print(f"\n{disease.upper()} (from database):")
            for i, region_data in enumerate(top_10, 1):
                print(f"  {i:2d}. {region_data['region']:30s} = {region_data['score']:3d}")
        
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
        
        # Get top 10 from grouped
        grouped_sorted = sorted(grouped.items(), key=lambda x: x[1], reverse=True)[:10]
        
        print(f"{'Rank':<6} {'Region':<30} {'Grouped':<10} {'Individual':<12} {'Stored':<10} {'Match':<10}")
        print("-" * 80)
        
        for rank, (region, grouped_score) in enumerate(grouped_sorted, 1):
            ind_score = individual.get(region, "N/A")
            stored_score = stored.get(region, "N/A")
            
            # Check if rankings match
            match = ""
            if stored:
                stored_rank = None
                stored_sorted = sorted(stored.items(), key=lambda x: x[1], reverse=True)
                for i, (r, _) in enumerate(stored_sorted, 1):
                    if r == region:
                        stored_rank = i
                        break
                
                if stored_rank == rank:
                    match = "✅"
                elif stored_rank:
                    match = f"⚠️  #{stored_rank}"
                else:
                    match = "❌"
            
            print(f"{rank:<6} {region:<30} {int(grouped_score):<10} {str(ind_score):<12} {str(stored_score):<10} {match:<10}")


def main():
    print("\n" + "=" * 80)
    print("Google Trends Normalization Diagnostic")
    print("=" * 80)
    print(f"Testing diseases: {', '.join(TEST_DISEASES)}")
    print(f"Timeframe: today 1-m (last month)")
    print()
    
    # Test 1: Grouped fetch (what Google Trends website does)
    grouped_results = test_grouped_fetch()
    
    # Test 2: Individual fetches (what we might be doing wrong)
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
    print("1. Do grouped results match Google Trends website? (Should be YES)")
    print("2. Do individual results differ from grouped? (Likely YES - different normalization)")
    print("3. Do stored results match grouped or individual? (This tells us the problem)")
    print()
    print("Expected Behavior:")
    print("- Google Trends website: Fetches all selected terms together → proper normalization")
    print("- Our app (current): Fetches in groups of 5 → normalization within each group")
    print("- Problem: When comparing diseases from different groups, scores are incomparable")
    print()


if __name__ == "__main__":
    main()

