# Google Trends Data Mismatch - Root Cause

## Current Situation

**Google Trends Website** shows (sorting by COVID-19):
1. France (97)
2. St. Helena (91)
3. Greece (93)
4. Ireland (93)
5. Spain (96)

**Our App** shows:
1. Angola (98)
2. Papua New Guinea (96)
3. Martinique (95)
4. Isle of Man (94)
5. Jersey (94)

**API Test Results** (fresh data):
- France = 97
- Spain = 96
- Greece = 93
- Ireland = 93
- St. Helena = 91

## Root Cause

The database has **stale or differently normalized data**. The API returns France, Spain, Greece, etc., but the database has Angola, Papua New Guinea, etc.

### Possible Reasons:
1. **Data collected at different time**: Google Trends data changes over time
2. **Different normalization**: Data might have been collected when diseases were in different groups
3. **Data collection issue**: The collection script might not have fetched all diseases together

## Solutions

### Solution 1: Re-collect Data (Recommended)
Run the collection script to get fresh data:
```bash
python scripts/collect_google_trends.py
```

This will fetch fresh data with proper normalization (diseases in same group).

### Solution 2: Verify Data Collection
Check if COVID-19, Ebola, and Measles were fetched together in the database:
- They should all have the same `date` in the database
- They should be from the same collection run

### Solution 3: Fetch On-Demand (Future Enhancement)
For real-time accuracy, fetch data on-demand when comparing multiple diseases instead of using pre-collected data.

## Current Fix Status

✅ **Filtering implemented**: Regions with score 100 are filtered out
✅ **Ranking improved**: Uses combined score for tie-breaking

❌ **Data mismatch**: Database has different regions than Google Trends website

## Next Steps

1. **Re-run collection script** to get fresh data
2. **Verify** that COVID-19, Ebola, Measles are in the same group and fetched together
3. **Check database** to confirm France, Spain, Greece are present after re-collection
4. **Test app** to see if it matches Google Trends website after fresh data

## Files Modified

- `src/screens/Dashboard/sections/DiseaseRegionMap.tsx` - Added filtering and improved ranking

