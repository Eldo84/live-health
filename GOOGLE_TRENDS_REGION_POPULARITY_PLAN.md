# Google Trends Region-Based Popularity Implementation Plan

## Overview
Add location-based popularity visualization to the Disease Tracking tab, showing where search terms were most popular during a specified time frame. Values are on a 0-100 scale where 100 is the location with the highest popularity as a fraction of total searches.

## Implementation Steps

### 1. Database Schema (Migration)

**New Table: `google_trends_regions`**
- `id` (bigint, primary key)
- `disease` (text, not null) - Disease name
- `region` (text, not null) - Country/region name (e.g., "United States", "Brazil")
- `region_code` (text) - ISO country code if available (optional, for better matching)
- `popularity_score` (int, 0-100) - Google Trends popularity score
- `date` (date, not null) - Date of the data point
- `collected_at` (timestamptz) - When data was collected
- Unique constraint: `(disease, region, date)`

**Indexes:**
- `idx_google_trends_regions_disease` on `(disease)`
- `idx_google_trends_regions_date` on `(date desc)`
- `idx_google_trends_regions_disease_date` on `(disease, date desc)`
- `idx_google_trends_regions_region` on `(region)`

**RPC Function:**
- `get_disease_trends_regions(disease_names text[], start_date date, end_date date)`
  - Returns region popularity data for selected diseases within date range
  - Groups by disease and region, returns latest popularity score per region

### 2. Python Script Modifications

**File: `scripts/collect_google_trends.py`**

**Changes:**
1. Add function `fetch_region_data(pytrends, diseases)` to fetch `interest_by_region()`
2. Normalize region names to match our geocoding lookup (handle variations like "United States" vs "US")
3. Store region data in `google_trends_regions` table
4. Add region data collection to main() function
5. Handle rate limiting and retries for region data

**Key Implementation Details:**
- Use `pytrends.interest_by_region(resolution='COUNTRY', inc_low_vol=True, inc_geo_code=False)`
- Map Google Trends region names to our country lookup format
- Store data with current date (or date range if available)
- Handle regions with insufficient data (score = 0)

### 3. Frontend Hook

**New File: `src/lib/useGoogleTrendsRegions.ts`**

**Interface:**
```typescript
interface RegionPopularityData {
  disease: string;
  regions: Array<{
    region: string;
    popularity_score: number;
    coordinates?: [number, number]; // Optional, for map display
  }>;
}

interface UseGoogleTrendsRegionsReturn {
  regionData: RegionPopularityData[];
  loading: boolean;
  error: string | null;
}
```

**Function:**
- `useGoogleTrendsRegions(selectedDiseases: string[], timeRange: string)`
- Fetches region data from Supabase RPC function
- Maps region names to coordinates using `geocodeLocation()` from `lib/geocode.ts`
- Returns data grouped by disease

### 4. UI Component - Region Popularity Map

**New File: `src/screens/Dashboard/sections/DiseaseRegionMap.tsx`**

**Features:**
- Interactive map using React-Leaflet (same as existing maps)
- Color-coded markers/circles based on popularity score:
  - 0-20: Light blue/gray (low)
  - 21-40: Light green (low-medium)
  - 41-60: Yellow (medium)
  - 61-80: Orange (high)
  - 81-100: Red (very high)
- Tooltip on hover showing:
  - Region name
  - Disease name
  - Popularity score (0-100)
  - Explanation: "X% of searches in this region"
- Support for multiple diseases (different colors per disease)
- Time range selector (syncs with main Disease Tracking time range)
- Legend showing color scale and disease colors

**Map Visualization Options:**
1. **Option A: Marker-based** (Recommended)
   - Circle markers sized by popularity score
   - Color intensity based on score
   - Easy to implement, works with existing map infrastructure

2. **Option B: Choropleth overlay**
   - Color countries/regions based on popularity
   - Requires GeoJSON country boundaries
   - More complex but visually appealing

**Recommendation:** Start with Option A (markers), can upgrade to choropleth later.

### 5. Integration with Disease Tracking Component

**File: `src/screens/Dashboard/sections/DiseaseTracking.tsx`**

**Changes:**
1. Add new tab/section: "Interest by Region" alongside "Interest over Time"
2. Use Tabs component to switch between:
   - "Interest over Time" (existing chart)
   - "Interest by Region" (new map)
3. Share time range selector between both views
4. Share selected diseases between both views
5. Add loading/error states for region map

**Layout:**
- Keep existing chart view as default
- Add tab switcher in header
- Show region map when "Interest by Region" tab is selected
- Maintain same time range controls

### 6. Data Collection Schedule

**Update GitHub Actions workflow:**
- Extend existing Google Trends collection to include region data
- Collect region data weekly (same frequency as time series data)
- Store historical region data (keep last 3 months for time range filtering)

### 7. Edge Cases & Considerations

**Region Name Normalization:**
- Google Trends may return "United States" while our lookup uses "United States"
- Create mapping function to normalize region names
- Handle special cases: "US" → "United States", "UK" → "United Kingdom", etc.

**Missing Coordinates:**
- Some regions may not have coordinates in our lookup
- Fallback: Skip regions without coordinates (don't show on map)
- Log missing regions for future addition to lookup

**Insufficient Data (Score = 0):**
- Google Trends returns 0 when there's not enough data
- Option: Don't show regions with score 0
- Option: Show with very light color/gray
- Recommendation: Don't show (cleaner map)

**Multiple Diseases:**
- When multiple diseases selected, show all on same map
- Use different colors per disease (from existing color palette)
- Add legend showing which color = which disease
- Allow toggling diseases on/off

**Time Range Filtering:**
- Region data is aggregated over time range
- Use latest popularity score per region within time range
- Or average if multiple data points exist (prefer latest)

## Implementation Order

1. ✅ Create database migration for `google_trends_regions` table
2. ✅ Modify Python script to collect region data
3. ✅ Create frontend hook `useGoogleTrendsRegions`
4. ✅ Create `DiseaseRegionMap` component
5. ✅ Integrate into `DiseaseTracking` component with tabs
6. ✅ Test with sample data
7. ✅ Update GitHub Actions workflow
8. ✅ Deploy and verify data collection

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] Python script fetches region data correctly
- [ ] Region names are normalized properly
- [ ] Frontend hook fetches data from Supabase
- [ ] Map displays markers with correct colors
- [ ] Tooltips show correct information
- [ ] Time range filtering works
- [ ] Multiple diseases display correctly
- [ ] Coordinates are mapped correctly
- [ ] Missing coordinates are handled gracefully
- [ ] Tab switching works smoothly
- [ ] Loading/error states display correctly

## Future Enhancements

1. **Choropleth Map**: Upgrade from markers to country-colored overlay
2. **Historical Animation**: Show how popularity changes over time
3. **Region Comparison**: Side-by-side comparison of regions
4. **Export Data**: Allow exporting region popularity data
5. **Sub-region Support**: City/state level popularity (if Google Trends provides)

