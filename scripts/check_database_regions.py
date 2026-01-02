"""
Check what region data we have stored in the database for COVID-19, Ebola, Measles
"""

import os
import sys
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE = os.environ.get("SUPABASE_SERVICE_ROLE")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE:
    print("⚠️  Supabase credentials not set.")
    print("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE environment variables")
    sys.exit(1)

TEST_DISEASES = ["covid", "ebola", "measles"]

def check_database():
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE)
    
    print("=" * 80)
    print("Checking database for COVID-19, Ebola, Measles region data")
    print("=" * 80)
    print()
    
    # Get latest region data
    response = supabase.rpc(
        "get_latest_disease_trends_regions",
        {
            "disease_names": TEST_DISEASES,
            "days_back": 30
        }
    ).execute()
    
    if not response.data:
        print("❌ No data in database")
        return
    
    print(f"✅ Found {len(response.data)} records in database")
    print()
    
    # Group by disease
    from collections import defaultdict
    by_disease = defaultdict(list)
    
    for row in response.data:
        by_disease[row['disease']].append({
            'region': row['region'],
            'score': row['popularity_score'],
            'date': row['date']
        })
    
    # Show top regions for each disease
    website_regions = ["France", "Spain", "Greece", "Ireland", "St. Helena"]
    app_regions = ["Angola", "Papua New Guinea", "Martinique", "Isle of Man", "Jersey"]
    
    for disease in TEST_DISEASES:
        if disease not in by_disease:
            print(f"⚠️  {disease} not in database")
            continue
        
        regions = sorted(by_disease[disease], key=lambda x: x['score'], reverse=True)
        top_20 = regions[:20]
        
        print(f"\n{disease.upper()} - Top 20 regions in database:")
        print("-" * 80)
        for i, region_data in enumerate(top_20, 1):
            marker = ""
            if region_data['region'] in website_regions:
                marker = " [WEBSITE]"
            elif region_data['region'] in app_regions:
                marker = " [APP]"
            print(f"  {i:2d}. {region_data['region']:30s} = {region_data['score']:3d} (date: {region_data['date']}){marker}")
        
        # Check specific regions
        print(f"\n{disease.upper()} - Checking specific regions:")
        print("-" * 80)
        check_regions = website_regions + app_regions
        for region_name in check_regions:
            found = None
            for r in regions:
                if r['region'].lower() == region_name.lower():
                    found = r
                    break
            if found:
                print(f"  {region_name:30s} = {found['score']:3d} (date: {found['date']})")
            else:
                print(f"  {region_name:30s} = NOT FOUND")
    
    # Check dates
    print("\n" + "=" * 80)
    print("Data Collection Dates:")
    print("=" * 80)
    dates = set()
    for row in response.data:
        dates.add(row['date'])
    dates = sorted(dates, reverse=True)
    print(f"Latest date: {dates[0] if dates else 'N/A'}")
    print(f"Date range: {dates[-1] if dates else 'N/A'} to {dates[0] if dates else 'N/A'}")
    print(f"Total unique dates: {len(dates)}")

if __name__ == "__main__":
    check_database()

