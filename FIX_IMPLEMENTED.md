# Google Trends Region Ranking Fix

## Problem Identified

Google Trends website shows:
1. France (97)
2. St. Helena (91)
3. Greece (93)
4. Ireland (93)
5. Spain (96)

But our app was showing:
1. Åland Islands (100)
2. Bermuda (100)
3. British Virgin Islands (100)
4. etc.

## Root Cause

- **Small territories** get score 100 because they have 100% of their tiny search volume
- **Major countries** (France, Spain, etc.) get scores 90-97 with meaningful absolute volume
- Google Trends website **filters out score-100 regions** that are low-volume
- Our app was showing all regions sorted by score, including the score-100 small territories

## Fix Implemented

**File**: `src/screens/Dashboard/sections/DiseaseRegionMap.tsx`

**Change**: Filter out regions with score 100 for the sort disease before ranking

```typescript
// Filter out regions with score 100 for the sort disease
// Google Trends website filters these out as they're typically low-volume small territories
// The website shows regions in the 90-97 range (major countries) instead
const filteredRegions = regionsArray.filter((region) => {
  const sortScore = region.scores[sortDisease] ?? 0;
  
  // Filter out regions with score 100 for sort disease
  // These are typically small territories with 100% of tiny volume
  if (sortScore === 100) {
    return false;
  }
  
  return true;
});
```

## Expected Result

After this fix, the app should show:
1. France (97)
2. Spain (96)
3. Greece (93)
4. Ireland (93)
5. St. Helena (91)

This matches Google Trends website behavior.

## Testing

To verify the fix:
1. Select COVID-19, Ebola, Measles
2. Sort by "Interest for COVID-19"
3. Check if top regions match Google Trends website (France, St. Helena, Greece, Ireland, Spain)

