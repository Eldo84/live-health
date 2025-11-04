# Implementation Status - Map Data Flow

## ✅ Completed Steps

### 1. Database Setup ✅
- ✅ Applied core migrations (diseases, countries, outbreaks, alerts)
- ✅ Created news collection tables (news_sources, news_articles, disease_keywords, outbreak_signals)
- ✅ Created pathogen and category tables
- ✅ Added indexes for performance (especially location queries)
- ✅ Configured RLS policies (temporarily set to allow public read for development)

### 2. Initial Data Seeded ✅
- ✅ News sources (CDC, WHO, Google News, etc.)
- ✅ Disease keywords (basic set from existing diseases)
- ✅ Outbreak categories (10 categories with colors)

### 3. Edge Function Created ✅
**File**: `supabase/functions/collect-outbreak-data/index.ts`

**Flow**:
1. Fetches keywords from Google Spreadsheet
2. Fetches news from WHO RSS and Google News (per keyword)
3. Matches articles to diseases using keyword matching
4. Extracts location names from article text
5. Geocodes locations to coordinates (OpenCage API + fallback)
6. Stores articles and creates outbreak_signals in database
7. Deduplicates signals (same disease + country + within 24h)

### 4. Frontend Hook Created ✅
**File**: `src/lib/useSupabaseOutbreakSignals.ts`

- Fetches outbreak_signals from Supabase
- Joins with diseases, countries, articles, categories
- Transforms to map-compatible format
- Supports category filtering

### 5. Map Component Updated ✅
**File**: `src/screens/HomePageMap/sections/MapSection/InteractiveMap.tsx`

- Now uses `useSupabaseOutbreakSignals` instead of external APIs
- Still supports category filtering
- Maintains existing visualization (pie charts at low zoom, markers at high zoom)

---

## 📋 How the Data Flow Works

### Complete Pipeline:

```
1. Trigger Edge Function
   ↓
2. Fetch Spreadsheet → Extract Keywords
   ↓
3. Fetch News (WHO RSS + Google News per keyword)
   ↓
4. Match Articles to Diseases (keyword matching)
   ↓
5. Extract Locations (pattern matching)
   ↓
6. Geocode Locations → Coordinates
   ↓
7. Store in Database:
   - news_articles
   - outbreak_signals (with lat/lng)
   ↓
8. Frontend Hook Fetches Signals
   ↓
9. Map Displays Markers
```

---

## 🧪 Testing Instructions

### Step 1: Set Environment Variables

Create `.env.local` or ensure `.env` has:
```env
VITE_SUPABASE_URL=https://mevpqgmyepfxexprjkft.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

### Step 2: Deploy Edge Function

```bash
cd supabase/functions/collect-outbreak-data
supabase functions deploy collect-outbreak-data
```

Or if using Supabase CLI locally:
```bash
supabase functions deploy collect-outbreak-data --project-ref mevpqgmyepfxexprjkft
```

**Important**: Set Edge Function secrets:
```bash
supabase secrets set OPENCAGE_API_KEY=your_opencage_key
```

### Step 3: Trigger Data Collection

**Option A: Manual Trigger (Browser Console)**
```javascript
fetch('https://mevpqgmyepfxexprjkft.supabase.co/functions/v1/collect-outbreak-data', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${YOUR_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(console.log);
```

**Option B: Add Button to Dashboard**
Create a button in the Dashboard that calls the Edge Function.

**Option C: Scheduled (Future)**
Set up pg_cron to run automatically.

### Step 4: View on Map

1. Start dev server: `npm run dev`
2. Navigate to `/map`
3. Map should show outbreak signals from database
4. Click category icons to filter
5. Zoom in to see individual markers
6. Zoom out to see aggregated pie charts

---

## 🔍 Verifying Data

### Check Database Directly:

```sql
-- Check outbreak signals
SELECT 
  os.id,
  d.name as disease,
  c.name as country,
  os.latitude,
  os.longitude,
  os.confidence_score,
  os.detected_at
FROM outbreak_signals os
JOIN diseases d ON d.id = os.disease_id
LEFT JOIN countries c ON c.id = os.country_id
ORDER BY os.detected_at DESC
LIMIT 10;

-- Check news articles
SELECT title, url, diseases_mentioned, published_at
FROM news_articles
ORDER BY published_at DESC
LIMIT 10;
```

### Check Frontend Console:

- Open browser DevTools
- Look for any errors in console
- Check Network tab for Supabase API calls
- Verify signals are being fetched

---

## 🐛 Troubleshooting

### Map shows "No data"
- **Check**: Are there any outbreak_signals in database?
- **Solution**: Run Edge Function to collect data

### Map shows loading forever
- **Check**: Supabase URL and ANON_KEY in env
- **Check**: Browser console for errors
- **Solution**: Verify RLS policies allow read access

### Edge Function fails
- **Check**: Edge Function logs in Supabase dashboard
- **Check**: OpenCage API key is set (optional, has fallback)
- **Check**: Network connectivity (WHO RSS, Google News)

### No matches found
- **Check**: Are keywords in spreadsheet matching article text?
- **Check**: Keyword table has entries for diseases
- **Solution**: Add more keywords to `disease_keywords` table

---

## 📊 Expected Results

After running the Edge Function:

- **News Articles**: 20-50 articles stored (depending on sources available)
- **Outbreak Signals**: 10-30 signals created (articles that matched keywords)
- **Map Markers**: Signals displayed with colored markers by category
- **Filtering**: Category icons filter map to show only that category

---

## 🚀 Next Steps (Future Enhancements)

1. **Automation**: Set up cron job to run every 6 hours
2. **Better Geocoding**: Improve location extraction (NER, better patterns)
3. **More Sources**: Add CDC API, ProMED-mail
4. **Real-time Updates**: Use Supabase Realtime subscriptions
5. **Better Matching**: ML-based keyword matching
6. **Case Extraction**: Better extraction of case counts from articles
7. **Authentication**: Add proper auth and restrict RLS policies

---

## 📝 Key Files Reference

- **Edge Function**: `supabase/functions/collect-outbreak-data/index.ts`
- **Frontend Hook**: `src/lib/useSupabaseOutbreakSignals.ts`
- **Map Component**: `src/screens/HomePageMap/sections/MapSection/InteractiveMap.tsx`
- **Database Schema**: See migration files in `supabase/migrations/`

---

**Status**: ✅ **READY FOR TESTING**

Database is set up, Edge Function is created, frontend is connected. Run the Edge Function to collect data, then view on map!

