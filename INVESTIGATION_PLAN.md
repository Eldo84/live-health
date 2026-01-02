# Google Trends Data Mismatch Investigation Plan

## Current Understanding

### Facts:
1. **COVID-19, Ebola, Measles ARE in the same group** (Group 1: `["influenza", "covid", "measles", "cholera", "ebola"]`)
2. They ARE fetched together, so normalization should be correct
3. But our app shows completely different regions than Google Trends website

### User's Observation:
- **Google Trends website**: France, St. Helena, Greece, Ireland, Spain
- **Our app**: Åland Islands, Bermuda, British Virgin Islands, Burkina Faso, Caribbean Netherlands

### Key Differences:
- Our regions are mostly **small territories/islands**
- All showing score of **100**
- Google Trends shows **major countries**

## Investigation Steps

### Step 1: Test Google Trends API Directly
**Script**: `scripts/test_google_trends_normalization.py`

**What to test:**
1. Fetch ["covid", "ebola", "measles"] together (like Google Trends website)
2. Check what regions are returned
3. Check what scores they have
4. See if small territories are included

**Expected findings:**
- API will return many regions including small territories
- Small territories might have score 100 (100% of their tiny volume)
- Google Trends website likely filters these out

### Step 2: Check Our Stored Data
**Query database for:**
```sql
SELECT disease, region, popularity_score, date
FROM google_trends_regions
WHERE disease IN ('covid', 'ebola', 'measles')
  AND date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY disease, popularity_score DESC;
```

**What to check:**
1. Do we have France, Greece, Ireland, Spain in our data?
2. What scores do they have?
3. Are small territories (Åland Islands, Bermuda) in our data?
4. What scores do they have?

### Step 3: Compare API vs Stored Data
**Compare:**
- Regions returned by API vs regions in database
- Scores from API vs scores in database
- Identify any filtering/transformation we're doing

### Step 4: Check Ranking Logic
**In `DiseaseRegionMap.tsx` (line 199-202):**
```typescript
regionsArray.sort(
  (a, b) =>
    (b.scores[sortDisease] ?? 0) - (a.scores[sortDisease] ?? 0)
);
```

**Issue**: We're sorting by a SINGLE disease's score, not considering:
- Overall popularity across all diseases
- Search volume (we might be showing tiny territories with 100% of tiny volume)
- Google Trends website likely uses different ranking

### Step 5: Check Filtering
**In collection script (line 169):**
```python
if score == 0:
    continue
```

**Issue**: We only skip score=0, but we should probably:
- Filter out regions with very low absolute search volume
- Google Trends website likely has a minimum volume threshold

## Hypotheses

### Hypothesis 1: Low-Volume Regions
**Problem**: Small territories get score 100 because they have 100% of their tiny search volume
**Solution**: Filter out regions below a minimum search volume threshold

### Hypothesis 2: Wrong Ranking
**Problem**: We're sorting by single disease score, Google Trends uses combined/weighted ranking
**Solution**: Use a combined score or different ranking algorithm

### Hypothesis 3: Missing Filtering
**Problem**: Google Trends website filters out low-volume regions, we don't
**Solution**: Add filtering similar to Google Trends website

### Hypothesis 4: Data Collection Issue
**Problem**: We're using `inc_low_vol=True` which includes regions Google Trends website excludes
**Solution**: Use `inc_low_vol=False` or filter results

## Action Plan

### Phase 1: Investigation (Do First)
1. ✅ Create diagnostic script (`test_google_trends_normalization.py`)
2. ⏳ Run script to get actual API data
3. ⏳ Query database to see stored data
4. ⏳ Compare API vs stored vs website

### Phase 2: Identify Root Cause
1. Determine if it's a filtering issue
2. Determine if it's a ranking issue
3. Determine if it's a data collection issue

### Phase 3: Fix Implementation
1. Based on findings, implement appropriate fix:
   - If filtering: Add volume threshold filtering
   - If ranking: Fix ranking algorithm
   - If collection: Adjust collection parameters

## Next Steps

1. **Run the diagnostic script** to get real data
2. **Compare with database** to see what we're storing
3. **Identify the exact mismatch** point
4. **Create fix plan** based on findings

