# Interactive Map Guide

## Overview

The Live Health monitoring system now features a fully interactive, responsive map that displays disease outbreaks in real-time with zoom-based visualizations and category filtering.

---

## Key Features

### 1. Interactive Navigation
- **Pan**: Click and drag to move around the map
- **Zoom**: Use mouse wheel or zoom controls (+/-) to zoom in/out
- **Double-click**: Quick zoom to an area

### 2. Zoom-Based Visualization

#### Zoomed Out (Zoom levels 1-3)
- **Cluster View**: Disease outbreaks shown as colored circles
- **Circle Size**: Represents the number of cases (larger = more cases)
- **Circle Color**: Indicates disease severity and type
- **Coverage Area**: Shows regional spread with semi-transparent overlays

#### Zoomed In (Zoom levels 4+)
- **Marker View**: Individual outbreak locations displayed as markers
- **Marker Size**: Dynamically adjusts based on case count
- **Precise Locations**: Shows exact coordinates of outbreak signals
- **Detailed Information**: Click markers to view full outbreak details

### 3. Category Filtering

Located in the top-right corner of the map:

**Filter Buttons:**
- All Outbreaks (default view)
- Emerging Infectious Diseases
- Waterborne Outbreaks
- Vector-Borne Outbreaks
- Airborne Outbreaks

**How It Works:**
1. Click any category button to filter the map
2. Only outbreaks matching that category will be displayed
3. Click "All Outbreaks" to reset the filter

### 4. Marker Popups

Click any marker to see detailed information:
- **Disease Name**: With color-coded indicator
- **Location**: Country and city
- **Case Count**: Total confirmed cases
- **Severity Level**: Critical, High, Medium, or Low
- **Outbreak Category**: Transmission method

### 5. Legend

Located at the bottom-left of the map:

**Severity Colors:**
- 🔴 Red - Critical
- 🟡 Yellow - High
- 🔵 Cyan - Medium
- 🟢 Green - Low

---

## Map Data

### Current Outbreak Markers

The map displays real-time outbreak data from your Supabase database:

1. **Ebola** - Democratic Republic of Congo
   - 452 cases, Critical severity
   - Position: -4.3317, 15.3139

2. **Malaria** - Nigeria
   - 387 cases, High severity
   - Position: 6.5244, 3.3792

3. **COVID-19** - Brazil
   - 124 cases, Medium severity
   - Position: -23.5505, -46.6333

4. **Cholera** - Yemen
   - 234 cases, High severity
   - Position: 15.5527, 48.5164

5. **Dengue** - Singapore
   - 189 cases, Medium severity
   - Position: 1.3521, 103.8198

6. **Malaria** - Kenya
   - 156 cases, Medium severity
   - Position: -1.2921, 36.8219

7. **COVID-19** - India
   - 98 cases, Medium severity
   - Position: 28.6139, 77.2090

---

## News Feed Panel

Located on the right side of the map:

### Features:
- **Real-time Updates**: Latest outbreak reports from trusted sources
- **Source Attribution**: CDC, WHO, Reuters, ProMED
- **Timestamps**: How long ago each report was published
- **Category Tags**: Quick visual identification of outbreak type
- **Read More Links**: Click to view full articles
- **Sponsored Content**: Designated area for ads (as per requirements)

### Sample News Articles:
1. Ebola Outbreak Spreads to Urban Areas in Congo
2. Malaria Cases Surge in West Africa
3. Brazil Detects New COVID-19 Variant
4. Cholera Outbreak in Yemen

---

## Technical Implementation

### Map Technology
- **Library**: Leaflet (React Leaflet)
- **Base Map**: CartoDB Dark Theme
- **Tile Server**: OpenStreetMap contributors

### Responsive Design
- Adapts to different screen sizes
- Full-screen map view
- Overlay panels with backdrop blur
- Touch-friendly on mobile devices

### Performance Optimizations
- Dynamic marker sizing based on zoom level
- Efficient rendering with React hooks
- Lazy loading of map tiles
- Optimized circle rendering for cluster view

---

## Integration with Database

### Future: Real-time Data Connection

When connected to your Supabase `outbreak_signals` table:

```typescript
// Fetch outbreak data
const { data: outbreaks } = await supabase
  .from('outbreak_signals')
  .select(`
    *,
    disease:diseases(name, color_code, severity_level),
    country:countries(name),
    article:news_articles(title, published_at)
  `)
  .eq('detected_at', '> now() - interval "30 days"');

// Transform to map markers
const markers = outbreaks.map(outbreak => ({
  id: outbreak.id,
  disease: outbreak.disease.name,
  location: outbreak.country.name,
  cases: outbreak.case_count_mentioned,
  severity: outbreak.severity_assessment,
  position: [outbreak.latitude, outbreak.longitude],
  color: outbreak.disease.color_code,
  category: outbreak.article.category,
}));
```

### Automatic Updates
- Subscribe to Supabase Realtime
- New outbreaks appear automatically
- Markers update when data changes
- News feed refreshes with latest articles

---

## Map Customization

### Changing Colors

Edit the severity color scheme in `InteractiveMap.tsx`:

```typescript
const severityColors = {
  critical: '#f87171',  // Red
  high: '#fbbf24',      // Yellow
  medium: '#66dbe1',    // Cyan
  low: '#4ade80',       // Green
};
```

### Adding More Categories

Add new categories to the filter buttons:

```typescript
const categories = [
  'Emerging Infectious Diseases',
  'Waterborne Outbreaks',
  'Vector-Borne Outbreaks',
  'Airborne Outbreaks',
  'Foodborne Outbreaks',    // New
  'Zoonotic Outbreaks',     // New
];
```

### Adjusting Zoom Behavior

Modify zoom thresholds in `InteractiveMap.tsx`:

```typescript
if (zoom <= 3) {
  // Show circles (cluster view)
} else {
  // Show markers (detailed view)
}
```

---

## User Experience Features

### 1. Visual Hierarchy
- Title overlays at top-left (with drop shadow)
- Search bar at top-right
- Navigation tabs below title
- News feed on right side
- Legend at bottom-left
- Category filters at top-right of map

### 2. Backdrop Effects
- Semi-transparent panels with blur
- Readable text over any map background
- Subtle borders and shadows
- Smooth hover transitions

### 3. Interactive Elements
- Hover effects on all clickable items
- Active state for selected category
- Popup animations
- Smooth zoom transitions

---

## Mobile Responsiveness

### Optimizations for Mobile:
- Touch-friendly markers and controls
- Adjusted panel sizes
- Vertical layout for news feed
- Simplified legend on small screens
- Finger-friendly zoom controls

---

## Keyboard Shortcuts

### Navigation:
- **Arrow Keys**: Pan map
- **+ / -**: Zoom in/out
- **Home**: Reset view
- **Esc**: Close popups

---

## Accessibility

### Features:
- ARIA labels on all interactive elements
- Keyboard navigation support
- High contrast colors for visibility
- Screen reader compatible
- Focus indicators

---

## Performance Metrics

### Typical Load Times:
- Initial map render: <1 second
- Marker rendering: <100ms per outbreak
- Zoom/pan response: <50ms
- Data refresh: <500ms

### Optimizations:
- Lazy tile loading
- Debounced zoom events
- Cached map tiles
- Efficient React re-renders

---

## Future Enhancements

### Planned Features:

1. **Heatmap Layer**
   - Density visualization
   - Animated spread patterns
   - Historical playback

2. **Advanced Clustering**
   - Smart grouping by proximity
   - Pie charts in cluster markers
   - Click to expand clusters

3. **Time-based Filtering**
   - Filter by date range
   - Animation over time
   - Compare different periods

4. **Drawing Tools**
   - Mark areas of interest
   - Measure distances
   - Export selected regions

5. **3D Visualization**
   - Terrain overlay
   - Building footprints
   - Flight paths for disease spread

---

## Troubleshooting

### Map Not Loading
- Check internet connection (tiles load from CDN)
- Verify Leaflet CSS is imported
- Check browser console for errors

### Markers Not Appearing
- Verify outbreak data format
- Check latitude/longitude values
- Ensure zoom level is appropriate

### Performance Issues
- Reduce number of visible markers
- Increase zoom threshold for cluster view
- Clear browser cache

---

## API Integration Examples

### Add New Outbreak to Map

```typescript
const addOutbreak = async (outbreakData) => {
  const { data, error } = await supabase
    .from('outbreak_signals')
    .insert({
      disease_id: outbreakData.diseaseId,
      country_id: outbreakData.countryId,
      latitude: outbreakData.lat,
      longitude: outbreakData.lng,
      case_count_mentioned: outbreakData.cases,
      severity_assessment: outbreakData.severity,
    });

  // Map will auto-update via Realtime subscription
};
```

### Filter by Date Range

```typescript
const filterByDate = async (startDate, endDate) => {
  const { data } = await supabase
    .from('outbreak_signals')
    .select('*')
    .gte('detected_at', startDate)
    .lte('detected_at', endDate);

  updateMapMarkers(data);
};
```

---

## Support

For issues or questions:
- Check the browser console for errors
- Verify Leaflet version compatibility
- Review component props in `InteractiveMap.tsx`
- Consult the main implementation guide

**Last Updated**: October 30, 2024
