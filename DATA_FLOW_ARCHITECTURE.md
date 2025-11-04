# Live Health - Data Flow Architecture & Implementation Logic

## 🎯 Goal
Automatically fetch outbreak-related news/data from official sources (CDC, WHO, Google News), match them to diseases/pathogens in your spreadsheet, extract locations, geocode coordinates, store in database, and visualize on an interactive map with proper categorization and clustering.

---

## 📊 Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATA SOURCE LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   CDC RSS    │  │   WHO RSS    │  │ Google News   │         │
│  │              │  │              │  │ RSS (keywords)│         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                  │                  │                 │
│         └──────────────────┴──────────────────┘                 │
│                           │                                     │
│                           ▼                                     │
│              ┌─────────────────────────┐                       │
│              │  Edge Function          │                       │
│              │  collect-outbreak-data  │                       │
│              └─────────────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    KEYWORD MATCHING LAYER                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────────────────────────────────────────┐     │
│  │  Step 1: Fetch Spreadsheet Data                      │     │
│  │  - Read Google Sheet CSV                              │     │
│  │  - Parse: Disease, Pathogen, Category, Keywords        │     │
│  │  - Build keyword lookup map                           │     │
│  └───────────────────────────────────────────────────────┘     │
│                           │                                     │
│                           ▼                                     │
│  ┌───────────────────────────────────────────────────────┐     │
│  │  Step 2: Extract Keywords for News Search             │     │
│  │  - Collect all unique keywords from spreadsheet        │     │
│  │  - Create search queries: keyword + "outbreak"        │     │
│  │  - Example: ["Listeria", "Anthrax", "Ebola"]          │     │
│  └───────────────────────────────────────────────────────┘     │
│                           │                                     │
│                           ▼                                     │
│  ┌───────────────────────────────────────────────────────┐     │
│  │  Step 3: Fetch News Articles (Parallel)               │     │
│  │  - CDC: Fetch latest outbreak reports                 │     │
│  │  - WHO: Fetch Disease Outbreak News (DONs)            │     │
│  │  - Google News: Search each keyword                     │     │
│  │  - Normalize all into unified article structure        │     │
│  └───────────────────────────────────────────────────────┘     │
│                           │                                     │
│                           ▼                                     │
│  ┌───────────────────────────────────────────────────────┐     │
│  │  Step 4: Match Articles to Diseases                    │     │
│  │  For each article:                                     │     │
│  │    - Extract text (title + description)                │     │
│  │    - Check against all keywords (case-insensitive)    │     │
│  │    - If match found: attach disease metadata          │     │
│  │    - Multiple matches possible (tag all found)         │     │
│  └───────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LOCATION EXTRACTION LAYER                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────────────────────────────────────────┐     │
│  │  Step 5: Extract Location Names                       │     │
│  │  Methods:                                             │     │
│  │  a) Pattern matching (country/city names)            │     │
│  │  b) Named Entity Recognition (if available)          │     │
│  │  c) Parse article title/description for locations     │     │
│  │  Example: "Ebola outbreak in Democratic Republic     │     │
│  │           of Congo" → "Democratic Republic of Congo"  │     │
│  └───────────────────────────────────────────────────────┘     │
│                           │                                     │
│                           ▼                                     │
│  ┌───────────────────────────────────────────────────────┐     │
│  │  Step 6: Geocode Locations to Coordinates             │     │
│  │  - Use OpenCage Geocoding API                         │     │
│  │  - Input: Location name (country/city)                │     │
│  │  - Output: [latitude, longitude]                      │     │
│  │  - Fallback: Predefined country coordinates           │     │
│  │  - Cache results to reduce API calls                   │     │
│  └───────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE STORAGE LAYER                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────────────────────────────────────────┐     │
│  │  Step 7: Store Structured Data                       │     │
│  │                                                       │     │
│  │  7a. Store News Articles                              │     │
│  │      → news_articles table                           │     │
│  │      Fields: title, content, url, published_at,        │     │
│  │              source_id, diseases_mentioned[]           │     │
│  │                                                       │     │
│  │  7b. Create Outbreak Signals                         │     │
│  │      → outbreak_signals table                        │     │
│  │      Fields: article_id, disease_id, country_id,     │     │
│  │              latitude, longitude, confidence_score,    │     │
│  │              severity_assessment, detected_at          │     │
│  │                                                       │     │
│  │  7c. Link to Existing Data                           │     │
│  │      - Find/create disease by name                    │     │
│  │      - Find/create country by name                    │     │
│  │      - Link to outbreak_category                      │     │
│  │      - Link to pathogen (if available)               │     │
│  │                                                       │     │
│  │  7d. Create Alerts (if high severity)                │     │
│  │      → alerts table                                   │     │
│  │      Only for: critical severity + high confidence    │     │
│  └───────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MAP VISUALIZATION LAYER                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────────────────────────────────────────┐     │
│  │  Step 8: Fetch Data for Map                           │     │
│  │  - React Hook: useSupabaseOutbreakSignals()          │     │
│  │  - Query outbreak_signals table                        │     │
│  │  - Join with: diseases, countries, outbreak_categories│     │
│  │  - Filter by: date range, category, severity          │     │
│  └───────────────────────────────────────────────────────┘     │
│                           │                                     │
│                           ▼                                     │
│  ┌───────────────────────────────────────────────────────┐     │
│  │  Step 9: Render on Leaflet Map                        │     │
│  │                                                       │     │
│  │  Low Zoom (≤4):                                      │     │
│  │    - Aggregate by geographic grid cells                │     │
│  │    - Show pie charts by category                      │     │
│  │    - Each pie shows category breakdown                │     │
│  │                                                       │     │
│  │  High Zoom (>4):                                     │     │
│  │    - Show individual markers                          │     │
│  │    - Color by category                                │     │
│  │    - Cluster nearby markers                           │     │
│  │    - Popup on click with full details                 │     │
│  │                                                       │     │
│  │  Category Filtering:                                  │     │
│  │    - User selects category icon                        │     │
│  │    - Map filters to show only that category           │     │
│  └───────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Detailed Step-by-Step Logic

### **PHASE 1: Data Collection & Matching**

#### Step 1: Load Spreadsheet Keywords
```typescript
// Pseudocode
const spreadsheetData = await fetchGoogleSheetCSV();
const keywordMap = new Map();

for each row in spreadsheetData:
  const disease = row.Disease;
  const pathogen = row.Pathogen;
  const category = row["Outbreak Category"];
  const keywords = row.Keywords.split(/[,;]/).map(k => k.trim());
  
  for each keyword in keywords:
    keywordMap.set(keyword.toLowerCase(), {
      disease,
      pathogen,
      category,
      diseaseId: null, // Will resolve from DB
      categoryId: null
    });
```

**Purpose**: Build a lookup table where we can quickly match article text to diseases.

---

#### Step 2: Fetch News Articles from Multiple Sources

**A. CDC Outbreak Data**
```
URL: https://data.cdc.gov/resource/9mfq-cb36.json
Method: GET with $limit parameter
Response: JSON array of CDC records
Processing: Extract state, date, case counts
```

**B. WHO Disease Outbreak News (DONs)**
```
URL: https://www.who.int/feeds/entity/csr/don/en/rss.xml
Method: GET
Response: XML RSS feed
Processing: Parse XML, extract <item> elements with title, link, pubDate, description
```

**C. Google News RSS (Per Keyword)**
```
URL: https://news.google.com/rss/search?q={keyword}+outbreak&hl=en-US&gl=US&ceid=US:en
Method: GET (via rss2json.com proxy)
Response: JSON with items array
Processing: Extract title, link, pubDate, description
Note: Call once per unique keyword from spreadsheet
```

**Normalization**: Convert all sources into unified structure:
```typescript
interface NormalizedArticle {
  title: string;
  content: string; // description or content
  url: string;
  publishedAt: string; // ISO date
  source: "CDC" | "WHO" | "Google News";
  rawData: any; // Original data for reference
}
```

---

#### Step 3: Keyword Matching Algorithm

```typescript
function matchArticleToDiseases(article: NormalizedArticle, keywordMap: Map) {
  const matches = [];
  const searchText = (article.title + " " + article.content).toLowerCase();
  
  // Check each keyword in our map
  for (const [keyword, metadata] of keywordMap.entries()) {
    if (searchText.includes(keyword)) {
      matches.push({
        keyword,
        disease: metadata.disease,
        pathogen: metadata.pathogen,
        category: metadata.category,
        confidence: calculateConfidence(keyword, searchText)
      });
    }
  }
  
  return matches; // Can have multiple matches per article
}

function calculateConfidence(keyword: string, text: string) {
  // Simple confidence based on:
  // - Keyword appears multiple times? Higher confidence
  // - Keyword appears in title? Higher confidence
  // - Long keyword match? Higher confidence
  
  const occurrences = (text.match(new RegExp(keyword, "gi")) || []).length;
  const inTitle = article.title.toLowerCase().includes(keyword);
  
  let confidence = 0.5; // Base confidence
  if (inTitle) confidence += 0.2;
  if (occurrences > 1) confidence += 0.15;
  if (keyword.length > 6) confidence += 0.15;
  
  return Math.min(confidence, 0.95); // Cap at 95%
}
```

**Edge Cases**:
- One article can match multiple diseases (e.g., "outbreak of Listeria and Salmonella")
- Some keywords are substrings of others (e.g., "Listeria" vs "Listeria monocytogenes")
  - Solution: Prefer longer, more specific keywords
- False positives (e.g., article mentions "outbreak" but in different context)
  - Solution: Require both keyword AND "outbreak" in text

---

### **PHASE 2: Location Extraction & Geocoding**

#### Step 4: Extract Location Names from Text

**Method 1: Pattern Matching (Simple)**
```typescript
const COUNTRY_PATTERNS = [
  /Democratic Republic of Congo/i,
  /United States|USA|US\b/i,
  /Kenya/i,
  /Nigeria/i,
  // ... full country list
];

function extractLocation(article: NormalizedArticle): string | null {
  const text = article.title + " " + article.content;
  
  // Check for explicit location mentions
  for (const pattern of COUNTRY_PATTERNS) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  
  // Check for common patterns like "outbreak in [Location]"
  const inPattern = /outbreak in ([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i;
  const inMatch = text.match(inPattern);
  if (inMatch) return inMatch[1];
  
  return null;
}
```

**Method 2: Named Entity Recognition (Advanced)**
- Use NLP library like `compromise` or call external NER API
- More accurate but adds complexity and latency
- Recommended for future enhancement

**Method 3: Fallback Strategies**
1. If article from CDC → Default to "United States"
2. If article from WHO → Extract from WHO's structured data if available
3. If no location found → Skip article (don't geocode "Unknown")

---

#### Step 5: Geocode Location Names to Coordinates

```typescript
async function geocodeLocation(locationName: string): Promise<[number, number] | null> {
  // Try OpenCage Geocoding API
  const apiKey = Deno.env.get("OPENCAGE_API_KEY");
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(locationName)}&key=${apiKey}&limit=1`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    const result = data.results[0];
    
    if (result?.geometry) {
      return [result.geometry.lat, result.geometry.lng];
    }
  } catch (error) {
    console.warn(`Geocoding failed for ${locationName}:`, error);
  }
  
  // Fallback to predefined coordinates
  const fallbackCoords = COUNTRY_COORDINATES[locationName];
  if (fallbackCoords) return fallbackCoords;
  
  return null; // Skip if can't geocode
}
```

**Caching Strategy**:
- Store geocoded results in database (countries table with coordinates)
- Cache in memory during batch processing
- Avoid duplicate API calls for same location

**Rate Limiting**:
- OpenCage has rate limits (free tier: 1 req/sec)
- Batch geocoding with delays between requests
- Use service account for higher limits

---

### **PHASE 3: Database Storage**

#### Step 6: Database Operations (In Order)

**6a. Ensure News Source Exists**
```sql
INSERT INTO news_sources (name, url, type, reliability_score, is_active)
VALUES ('CDC', 'https://www.cdc.gov', 'government', 0.95, true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO news_sources (name, url, type, reliability_score, is_active)
VALUES ('WHO', 'https://www.who.int', 'international_org', 0.98, true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO news_sources (name, url, type, reliability_score, is_active)
VALUES ('Google News', 'https://news.google.com', 'news', 0.70, true)
ON CONFLICT (name) DO NOTHING;
```

**6b. Store News Article**
```sql
INSERT INTO news_articles (
  source_id,
  title,
  content,
  url,
  published_at,
  scraped_at,
  diseases_mentioned,
  is_verified
)
VALUES (
  (SELECT id FROM news_sources WHERE name = $1),
  $2, -- title
  $3, -- content
  $4, -- url
  $5, -- published_at
  NOW(),
  ARRAY['Disease1', 'Disease2'], -- from matches
  false
)
ON CONFLICT (url) DO UPDATE SET
  scraped_at = NOW(),
  diseases_mentioned = EXCLUDED.diseases_mentioned
RETURNING id;
```

**6c. Resolve Disease ID (Find or Create)**
```sql
-- First, try to find existing disease
SELECT id FROM diseases WHERE name = $1;

-- If not found, create it
INSERT INTO diseases (name, severity_level, color_code)
VALUES ($1, 'medium', $2)
ON CONFLICT (name) DO NOTHING
RETURNING id;
```

**6d. Resolve Country ID (Find or Create)**
```sql
SELECT id FROM countries WHERE name = $1 OR code = $1;

-- If not found, create with default values
INSERT INTO countries (name, code, continent, population)
VALUES ($1, $2, 'Unknown', 0)
ON CONFLICT (code) DO NOTHING
RETURNING id;
```

**6e. Create Outbreak Signal**
```sql
INSERT INTO outbreak_signals (
  article_id,
  disease_id,
  country_id,
  latitude,
  longitude,
  confidence_score,
  case_count_mentioned,
  severity_assessment,
  is_new_outbreak,
  detected_at
)
VALUES (
  $1, -- article_id
  $2, -- disease_id
  $3, -- country_id (can be null)
  $4, -- latitude
  $5, -- longitude (can be null if no coords)
  $6, -- confidence_score (from matching)
  0,  -- case_count_mentioned (extract from text if possible)
  $7, -- severity_assessment ('low', 'medium', 'high', 'critical')
  true,
  NOW()
);
```

**6f. Link to Outbreak Category (if exists)**
```sql
-- Get category ID from disease_category mapping
SELECT category_id 
FROM disease_categories dc
JOIN outbreak_categories oc ON oc.id = dc.category_id
WHERE dc.disease_id = $1 AND oc.name = $2;
```

**6g. Create Alert (Conditional)**
```sql
-- Only create alert if:
-- 1. Confidence score > 0.85
-- 2. Severity is 'high' or 'critical'
IF confidence_score > 0.85 AND severity IN ('high', 'critical') THEN
  INSERT INTO alerts (
    outbreak_id, -- null for now (we're using signals, not outbreaks)
    type,
    title,
    description,
    is_read
  )
  VALUES (
    NULL,
    CASE 
      WHEN severity = 'critical' THEN 'critical'
      ELSE 'warning'
    END,
    'New ' || disease_name || ' Outbreak Detected',
    'Outbreak signal detected in ' || country_name || ' with ' || confidence_score || ' confidence',
    false
  );
END IF;
```

---

### **PHASE 4: Map Visualization**

#### Step 7: Frontend Data Fetching

**Create Supabase Hook:**
```typescript
function useSupabaseOutbreakSignals(filters?: {
  category?: string;
  dateRange?: { start: Date; end: Date };
  severity?: string[];
}) {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    let query = supabase
      .from('outbreak_signals')
      .select(`
        *,
        disease:diseases(name, severity_level, color_code),
        country:countries(name, code, continent),
        article:news_articles(title, url, published_at),
        category:disease_categories!inner(
          outbreak_category:outbreak_categories(name, color, icon)
        )
      `)
      .order('detected_at', { ascending: false });
    
    // Apply filters
    if (filters?.category) {
      query = query.eq('category.outbreak_categories.name', filters.category);
    }
    if (filters?.dateRange) {
      query = query
        .gte('detected_at', filters.dateRange.start.toISOString())
        .lte('detected_at', filters.dateRange.end.toISOString());
    }
    
    query.then(({ data, error }) => {
      if (error) console.error(error);
      else setSignals(data || []);
      setLoading(false);
    });
  }, [filters]);
  
  return { signals, loading };
}
```

**Transform for Map:**
```typescript
function transformSignalsToMapPoints(signals) {
  return signals
    .filter(s => s.latitude && s.longitude) // Only points with coordinates
    .map(signal => ({
      id: signal.id,
      disease: signal.disease.name,
      location: signal.country?.name || 'Unknown',
      category: signal.category?.outbreak_category?.name || 'Other',
      pathogen: signal.pathogen || '',
      position: [signal.latitude, signal.longitude],
      date: signal.detected_at,
      url: signal.article.url,
      severity: signal.severity_assessment,
      confidence: signal.confidence_score
    }));
}
```

---

#### Step 8: Map Rendering Logic

**Current Implementation (in InteractiveMap.tsx):**

**Low Zoom (≤4): Aggregated Pie Charts**
```
1. Divide map into grid cells (e.g., 60° x 60° cells)
2. Group signals by grid cell
3. Within each cell, count signals by category
4. Render pie chart marker at cell center
5. Each slice = one category, size = count
```

**High Zoom (>4): Individual Markers**
```
1. Filter signals by category (if selected)
2. Create colored marker for each signal
3. Use MarkerClusterGroup for nearby markers
4. Color = category color
5. Size = based on zoom level
6. Popup = disease name, location, category, link to article
```

**Category Filtering:**
```
User clicks category icon → 
  Update filter state → 
  Map re-renders with filtered signals →
  Update marker colors/visibility
```

---

## 🔄 Automation & Scheduling

### Option 1: Manual Trigger (Edge Function)
- User clicks "Refresh Data" button
- Calls Edge Function: `/functions/v1/collect-outbreak-data`
- Function runs entire pipeline
- Returns summary: "Processed X articles, created Y signals"

### Option 2: Scheduled Cron Job
```sql
-- Using pg_cron extension
SELECT cron.schedule(
  'collect-outbreak-data',  -- Job name
  '0 */6 * * *',            -- Every 6 hours
  $$                         -- SQL to execute
  SELECT net.http_post(
    url := 'https://[PROJECT].supabase.co/functions/v1/collect-outbreak-data',
    headers := '{"Authorization": "Bearer [SERVICE_ROLE_KEY]"}'::jsonb
  );
  $$
);
```

### Option 3: Real-time Webhook
- Google Sheets webhook on change
- Trigger Edge Function
- Only process new/changed rows

---

## 📋 Data Quality & Deduplication

### Duplicate Detection
```typescript
// Prevent duplicate signals
// Criteria: Same disease + same country + within 24 hours
const isDuplicate = async (diseaseId, countryId, lat, lng) => {
  const existing = await supabase
    .from('outbreak_signals')
    .select('id')
    .eq('disease_id', diseaseId)
    .eq('country_id', countryId)
    .gte('detected_at', new Date(Date.now() - 24*60*60*1000).toISOString())
    .maybeSingle();
  
  return !!existing;
};
```

### Confidence Thresholds
- **High Confidence (>0.85)**: Create alert, show prominently on map
- **Medium Confidence (0.60-0.85)**: Store but don't alert
- **Low Confidence (<0.60)**: Skip or mark for manual review

### Verification Workflow
1. Automatic signals start with `is_verified: false`
2. High-confidence signals can auto-verify
3. Manual review queue for medium/low confidence
4. UI to mark as verified/delete false positives

---

## 🎨 Map Visualization Details

### Category Color Coding
```typescript
const CATEGORY_COLORS = {
  "Foodborne Outbreaks": "#f87171",      // Red
  "Waterborne Outbreaks": "#66dbe1",     // Cyan
  "Vector-Borne Outbreaks": "#fbbf24",   // Yellow
  "Airborne Outbreaks": "#a78bfa",       // Purple
  "Contact Transmission": "#fb923c",     // Orange
  "Healthcare-Associated Infections": "#ef4444", // Red
  "Zoonotic Outbreaks": "#10b981",       // Green
  "Sexually Transmitted Infections": "#ec4899", // Pink
  "Vaccine-Preventable Diseases": "#3b82f6", // Blue
  "Emerging Infectious Diseases": "#f59e0b"   // Amber
};
```

### Marker Clustering
- Use `react-leaflet-cluster` library
- Cluster radius: 50px
- Disable clustering at zoom level 8+
- Show count badge on clusters

### Popup Information
```html
<div>
  <h3>{disease}</h3>
  <p>Location: {location}</p>
  <p>Category: {category}</p>
  <p>Pathogen: {pathogen}</p>
  <p>Detected: {date}</p>
  <p>Confidence: {confidence}%</p>
  <a href="{article_url}" target="_blank">Read Article →</a>
</div>
```

---

## 🚨 Error Handling & Edge Cases

### Missing Data Scenarios
1. **No location found**: Skip article (don't create signal without coordinates)
2. **No keyword match**: Skip article (not relevant)
3. **Geocoding fails**: Use fallback coordinates or skip
4. **Duplicate article**: Update existing, don't create new

### Rate Limiting
- Google News: Max 3 articles per keyword
- OpenCage: 1 request/second (free tier)
- WHO/CDC: No strict limits but add delays

### Fallback Strategies
- If spreadsheet can't be fetched: Use last cached version
- If geocoding API down: Use predefined country coordinates
- If database unavailable: Queue articles for later processing

---

## 📈 Performance Considerations

### Batch Processing
- Process articles in batches of 50
- Add 1-second delay between geocoding requests
- Use Promise.all for parallel news fetching

### Database Optimization
- Index on: `outbreak_signals(latitude, longitude)` for map queries
- Index on: `outbreak_signals(detected_at)` for time filtering
- Index on: `outbreak_signals(disease_id, country_id)` for deduplication

### Caching
- Cache geocoding results in database (countries table)
- Cache keyword map in memory during batch processing
- Cache spreadsheet data for 1 hour

---

## 🔐 Security Considerations

### API Keys
- Store OpenCage API key in Edge Function secrets
- Never expose in frontend code
- Use Supabase environment variables

### Data Validation
- Sanitize all user inputs (article text, keywords)
- Validate coordinates are within valid ranges
- Check URL format before storing

### Access Control
- Edge Function uses Service Role key (full access)
- Frontend uses Anon key (read-only via RLS)
- Only authenticated users can view data (per current RLS policies)

---

## 🎯 Summary: Complete Flow

1. **Trigger**: User clicks refresh OR scheduled cron job
2. **Load Keywords**: Fetch spreadsheet, build keyword map
3. **Fetch News**: Parallel requests to CDC, WHO, Google News
4. **Match**: For each article, find matching keywords → diseases
5. **Extract Location**: Parse country/city from article text
6. **Geocode**: Convert location name to lat/lng coordinates
7. **Store**: Save article, create outbreak signal, link to disease/country
8. **Alert**: Create alert if high confidence + high severity
9. **Visualize**: Frontend queries signals, displays on map
10. **Interact**: User filters by category, clicks markers, views details

**End-to-End Time**: ~2-5 minutes for 100 articles (depending on geocoding)

**Update Frequency**: Every 6 hours (or manual trigger)

---

This architecture ensures:
✅ **Automated data collection** from multiple sources
✅ **Intelligent matching** via keyword taxonomy
✅ **Accurate geocoding** for map visualization
✅ **Structured storage** in relational database
✅ **Real-time visualization** with filtering and clustering
✅ **Scalable design** for future enhancements

