# Google Trends Data Mismatch Analysis

## Problem Statement

When comparing COVID-19, Ebola, and Measles on Google Trends website, the top regions are:
1. France
2. St. Helena  
3. Greece
4. Ireland
5. Spain

But our app shows:
1. Åland Islands (100)
2. Bermuda (100)
3. British Virgin Islands (100)
4. Burkina Faso (100)
5. Caribbean Netherlands (100)

## Root Cause Analysis

### Current Collection Process

Our script (`collect_google_trends.py`) fetches diseases in **groups of 5**:

```python
TRACKED_DISEASES = [
    "influenza", "covid", "measles", "cholera", "ebola",  # Group 1
    "marburg virus", "dengue fever", "yellow fever", "zika virus", "plague",  # Group 2
    "mpox", "meningitis", "norovirus", "RSV virus", "SARS",  # Group 3
    "MERS", "bird flu", "hand foot mouth disease", "polio", "hepatitis A",  # Group 4
]

GROUP_SIZE = 5
```

**Key Issue**: COVID-19, Ebola, and Measles are all in **Group 1**, so they ARE fetched together. But the problem is different...

### How Google Trends Normalizes Region Data

When you call `pytrends.interest_by_region()` with multiple terms:

1. **Google Trends API normalizes scores PER TERM** within the query
2. Each term gets scores 0-100 where 100 = the region with highest interest for THAT term
3. The normalization is **independent** for each term in the query

**Example:**
- If you query ["covid", "ebola", "measles"] together:
  - COVID-19: France might get 100 (highest for COVID-19)
  - Ebola: St. Helena might get 100 (highest for Ebola)  
  - Measles: Greece might get 100 (highest for Measles)

### The Real Problem

Looking at the user's output:
- Our app shows regions like "Åland Islands", "Bermuda", "British Virgin Islands" with scores of 100
- These are likely **small territories** with very low search volume
- Google Trends website shows **major countries** like France, Greece, Ireland

**Hypothesis**: 
1. We're using `inc_low_vol=True` which includes regions with very low search volume
2. Small territories might have 100% of their searches for a disease (because total volume is tiny)
3. Google Trends website likely filters out or deprioritizes low-volume regions
4. Our ranking algorithm might be sorting incorrectly

### Investigation Steps

1. **Test Google Trends API directly** with ["covid", "ebola", "measles"]
   - Check what regions it returns
   - Check what scores they have
   - Compare with our stored data

2. **Check our stored data**
   - Query database for these 3 diseases
   - See what regions and scores we have
   - Check if we're storing low-volume regions

3. **Compare normalization**
   - Test: Fetch all 3 together (like Google Trends website)
   - Test: Fetch each individually
   - See if scores differ

4. **Check ranking logic**
   - How are we sorting regions in the UI?
   - Are we filtering low-volume regions?
   - Are we using the right disease for sorting?

### Expected Findings

Based on the symptoms:
- ✅ Diseases ARE fetched together (they're in same group)
- ❌ We're likely including too many low-volume regions
- ❌ Our ranking might be using wrong criteria
- ❌ Google Trends website might filter/weight regions differently

### Next Steps

1. Run `test_google_trends_normalization.py` to get actual data
2. Compare API results with stored data
3. Identify the exact mismatch point
4. Create fix plan based on findings

