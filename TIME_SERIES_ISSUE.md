# Google Trends Time-Series Data Issue

## Problem Identified

### Current Code (DiseaseTracking.tsx, lines 424-442):

```typescript
const chartDatasets = useMemo(() => {
  // ... get raw data ...
  
  let globalMax = 0;
  rawDatasets.forEach((ds) => ds.data.forEach((p) => { 
    if (p.interest_value > globalMax) globalMax = p.interest_value; 
  }));

  return rawDatasets.map((ds) => ({
    ...ds,
    data: ds.data.map((p) => ({
      ...p,
      normalized_value: globalMax > 0 ? Math.round((p.interest_value / globalMax) * 100) : 0,
    })),
  }));
}, [selectedDiseases, trends, cutoffDate]);
```

## The Issue: Double Normalization

1. **Google Trends API already normalizes**: When we fetch diseases in groups, the API normalizes each group independently (0-100 where 100 is the peak for that group).

2. **We normalize again**: The code finds the global max across ALL selected diseases and normalizes again. This is WRONG!

### Example:
- **Group 1**: ["influenza", "covid", "measles", "cholera", "ebola"]
  - COVID-19 peak = 100 (normalized within Group 1)
  - Measles peak = 80 (normalized within Group 1)
  
- **Group 2**: ["marburg virus", "dengue fever", "yellow fever", "zika virus", "plague"]
  - Dengue peak = 100 (normalized within Group 2)
  
- **If user selects**: COVID-19, Measles, Dengue
  - globalMax = 100 (from COVID-19 or Dengue)
  - We normalize again: COVID-19 stays 100, Measles stays 80, Dengue stays 100
  - But COVID-19 and Dengue are from different groups, so their scores aren't comparable!

## The Fix

**Don't re-normalize!** Use the raw `interest_value` from the database, which is already normalized by Google Trends API.

However, there's a catch:
- If diseases are in the **same group**: They're already comparable (normalized together)
- If diseases are in **different groups**: They're NOT comparable (normalized separately)

### Solution Options:

#### Option 1: Use Raw Values (Simple)
Just use `interest_value` directly without re-normalization. This works correctly when diseases are in the same group.

#### Option 2: Detect Group Mismatch (Better)
Check if selected diseases are in the same group. If not, show a warning or fetch fresh data together.

#### Option 3: Fetch On-Demand (Best)
When comparing multiple diseases, fetch them together on-demand to ensure proper normalization.

## Recommended Fix

Use **Option 1** for now (simplest), but add a comment explaining the limitation:

```typescript
// Use raw interest_value - already normalized by Google Trends API within each group
// Note: Diseases from different groups may not be directly comparable
normalized_value: p.interest_value
```

This matches Google Trends website behavior when diseases are in the same group.

