# Google Trends Data Mismatch - Investigation Summary

## Problem

**Google Trends Website** shows (for COVID-19, Ebola, Measles):
1. France
2. St. Helena
3. Greece
4. Ireland
5. Spain

**Our App** shows:
1. Åland Islands (100)
2. Bermuda (100)
3. British Virgin Islands (100)
4. Burkina Faso (100)
5. Caribbean Netherlands (100)

## Key Findings from Code Review

### ✅ Good News
- **COVID-19, Ebola, Measles ARE in the same group** (Group 1)
- They ARE fetched together in a single API call
- Normalization should be correct within the group

### ❌ Likely Issues

#### Issue 1: Low-Volume Regions Included
- We use `inc_low_vol=True` in `interest_by_region()` call
- Small territories/islands get score 100 because they have 100% of their tiny search volume
- Google Trends website likely filters these out or uses different criteria

#### Issue 2: Ranking Algorithm
- Our app sorts by **single disease score** (line 199-202 in DiseaseRegionMap.tsx)
- Google Trends website likely uses **combined/weighted ranking** across all diseases
- We show regions where ONE disease has high score, not where ALL diseases are popular

#### Issue 3: No Volume Filtering
- We only filter `score == 0` (line 169 in collect_google_trends.py)
- No minimum search volume threshold
- Google Trends website likely has a minimum volume requirement

## Investigation Plan

### Step 1: Test Google Trends API Directly
**Script**: `scripts/test_google_trends_normalization.py`

Run this to:
1. Fetch ["covid", "ebola", "measles"] together
2. See what regions API returns
3. See what scores they have
4. Compare with our stored data

### Step 2: Check Database
Query what we actually have stored:
```sql
SELECT disease, region, popularity_score, date
FROM google_trends_regions
WHERE disease IN ('covid', 'ebola', 'measles')
  AND date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY disease, popularity_score DESC
LIMIT 50;
```

### Step 3: Compare Results
- Do we have France, Greece, Ireland in our data? What scores?
- Do we have Åland Islands, Bermuda? What scores?
- Are small territories getting score 100?

## Most Likely Root Cause

**Hypothesis**: We're including low-volume regions that Google Trends website filters out.

Small territories like Åland Islands might have:
- Score 100 (100% of their tiny search volume)
- But absolute volume is very low
- Google Trends website filters these out or deprioritizes them

## Next Steps

1. **Run diagnostic script** to get actual API data
2. **Query database** to see what we stored
3. **Compare** API results vs stored data vs website
4. **Identify exact issue** (filtering, ranking, or both)
5. **Create fix** based on findings

## Potential Fixes (After Investigation)

### Fix 1: Filter Low-Volume Regions
- Add minimum search volume threshold
- Or use `inc_low_vol=False` in API call
- Filter out regions below threshold

### Fix 2: Fix Ranking Algorithm
- Use combined score across all diseases
- Weight by search volume
- Match Google Trends website ranking logic

### Fix 3: Adjust Collection Parameters
- Change `inc_low_vol=True` to `False`
- Or add post-processing filtering

## Files to Review

1. `scripts/collect_google_trends.py` - Data collection
2. `scripts/test_google_trends_normalization.py` - Diagnostic script (NEW)
3. `src/screens/Dashboard/sections/DiseaseRegionMap.tsx` - Ranking logic
4. `supabase/migrations/20250202000000_create_google_trends_regions.sql` - SQL function

## Commands to Run

```bash
# Run diagnostic script
cd /home/kiram/Desktop/live-health
python scripts/test_google_trends_normalization.py

# Or with environment variables
SUPABASE_URL=... SUPABASE_SERVICE_ROLE=... python scripts/test_google_trends_normalization.py
```

