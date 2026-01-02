# Google Trends Diagnostic Results

## Test Results (TEST 1: Grouped Fetch)

### COVID-19 Top 10 Regions (from API):
1. **Andorra** = 100
2. **American Samoa** = 100
3. **Antigua & Barbuda** = 100
4. **Bermuda** = 100
5. **Benin** = 100
6. **Bhutan** = 100
7. **Burundi** = 100
8. **Cape Verde** = 100
9. **British Virgin Islands** = 100
10. **Brunei** = 100

### Ebola Top 10 Regions (from API):
1. **Belize** = 66
2. **Turkmenistan** = 49
3. **Togo** = 48
4. **Sierra Leone** = 46
5. **Chad** = 43
6. **Burkina Faso** = 41
7. **Guinea** = 30
8. **Liberia** = 22
9. **Congo - Brazzaville** = 18
10. **Ghana** = 10

### Measles Top 10 Regions (from API):
1. **Sudan** = 94
2. **Somalia** = 62
3. **South Sudan** = 48
4. **Liberia** = 48
5. **Nigeria** = 45
6. **Sint Maarten** = 43
7. **Seychelles** = 42
8. **Zambia** = 42
9. **Ethiopia** = 41
10. **Gibraltar** = 40

## Key Findings

### ✅ Confirmed: The API Returns Small Territories with Score 100

**COVID-19** shows many small territories/islands with score 100:
- Andorra, American Samoa, Antigua & Barbuda, Bermuda, British Virgin Islands
- These match what our app is showing!

**Ebola and Measles** show different regions with lower scores:
- No score 100s for Ebola (max is 66)
- Measles has one high score (Sudan = 94) but mostly lower scores

### Root Cause Identified

1. **Google Trends API normalizes PER DISEASE**:
   - Each disease gets scores 0-100 independently
   - Score 100 = region with highest interest for THAT disease
   - Small territories can get 100 if they have 100% of their tiny volume

2. **Our App Sorts by Single Disease Score**:
   - We're sorting by COVID-19 score (default sortDisease)
   - This shows regions where COVID-19 = 100
   - But these are small territories, not major countries

3. **Google Trends Website Uses Different Ranking**:
   - Likely filters out low-volume regions
   - Or uses combined/weighted ranking across all diseases
   - Shows major countries where all diseases have meaningful interest

## The Problem

**Our app shows**: Small territories where COVID-19 = 100 (but absolute volume is tiny)

**Google Trends website shows**: Major countries (France, Greece, Ireland, Spain) where:
- All three diseases have meaningful interest
- Absolute search volume is significant
- Better represents real-world interest

## Solution Options

### Option 1: Filter Low-Volume Regions
- Add minimum search volume threshold
- Filter out regions below threshold
- Problem: pytrends doesn't provide absolute volume, only normalized scores

### Option 2: Change Ranking Algorithm
- Don't sort by single disease score
- Use combined score: average or weighted sum across all diseases
- Filter out regions where only one disease has high score

### Option 3: Filter Regions with Score 100
- Regions with score 100 might be low-volume
- Filter them out or deprioritize them
- Show regions with scores in a more reasonable range (e.g., 20-100)

### Option 4: Use inc_low_vol=False
- Change `inc_low_vol=True` to `False` in collection script
- This might exclude low-volume regions
- Test if this matches Google Trends website better

## Recommended Fix

**Best approach**: Combine Option 2 + Option 4

1. **Change collection**: Use `inc_low_vol=False` to exclude low-volume regions
2. **Fix ranking**: Sort by combined score (average of all diseases) instead of single disease
3. **Add filtering**: Filter out regions where only one disease has high score (e.g., COVID-19 = 100 but others = 0)

This should match Google Trends website behavior better.

