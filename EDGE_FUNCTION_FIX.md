# Edge Function Issue & Fix

## 🔍 Problem Identified

The Edge Function was triggered, but no data was collected. The likely issue is:

**The Edge Function needs `SUPABASE_SERVICE_ROLE_KEY` as an environment variable** for its own Supabase client (not just in the Authorization header).

## ✅ Solution

### Step 1: Set Edge Function Secrets

Go to Supabase Dashboard:
1. Navigate to **Edge Functions** → `collect-outbreak-data`
2. Click **Settings** tab
3. Scroll to **Secrets** section
4. Add these secrets:

```
SUPABASE_URL = https://mevpqgmyepfxexprjkft.supabase.co
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ldnBxZ215ZXBmeGV4cHJqa2Z0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjA5NjIwMCwiZXhwIjoyMDc3NjcyMjAwfQ.sdFiD1-8lnya324YAavCNpN_LfntFsaNvCpDTTK4L-U
OPENCAGE_API_KEY = (optional - has fallback)
```

### Step 2: Test Directly

After setting secrets, test the function:

```bash
curl -X POST https://mevpqgmyepfxexprjkft.supabase.co/functions/v1/collect-outbreak-data \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ldnBxZ215ZXBmeGV4cHJqa2Z0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjA5NjIwMCwiZXhwIjoyMDc3NjcyMjAwfQ.sdFiD1-8lnya324YAavCNpN_LfntFsaNvCpDTTK4L-U" \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "success": true,
  "articlesProcessed": 15,
  "signalsCreated": 8,
  "keywordsLoaded": 20
}
```

### Step 3: Check Results

After running, check the database:

```sql
-- Check signals created
SELECT COUNT(*) FROM outbreak_signals;

-- Check articles collected  
SELECT COUNT(*) FROM news_articles;

-- View recent signals
SELECT 
  d.name as disease,
  c.name as country,
  os.detected_at
FROM outbreak_signals os
JOIN diseases d ON d.id = os.disease_id
LEFT JOIN countries c ON c.id = os.country_id
ORDER BY os.detected_at DESC
LIMIT 10;
```

## 📋 Why This Happens

The Edge Function code uses:
```typescript
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);
```

These environment variables must be set in **Supabase Edge Function Secrets**, not just passed in the HTTP request.

## ✅ After Fix

Once secrets are set:
1. The cron job will work automatically
2. Manual triggers via database function will work
3. Direct HTTP calls will work
4. Data will be collected every 2 hours

