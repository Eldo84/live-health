# Testing Edge Function Directly

The database function uses `pg_net` which makes asynchronous HTTP requests. The Edge Function might also need environment variables set.

## Option 1: Test Edge Function Directly via HTTP

Use curl or Postman to test:

```bash
curl -X POST https://mevpqgmyepfxexprjkft.supabase.co/functions/v1/collect-outbreak-data \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ldnBxZ215ZXBmeGV4cHJqa2Z0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjA5NjIwMCwiZXhwIjoyMDc3NjcyMjAwfQ.sdFiD1-8lnya324YAavCNpN_LfntFsaNvCpDTTK4L-U" \
  -H "Content-Type: application/json"
```

## Option 2: Check Edge Function Environment Variables

The Edge Function uses:
- `SUPABASE_URL` - Should be auto-set
- `SUPABASE_SERVICE_ROLE_KEY` - **NEEDS TO BE SET** in Edge Function secrets
- `OPENCAGE_API_KEY` - Optional (has fallback)

Set these in Supabase Dashboard:
1. Go to Edge Functions → collect-outbreak-data
2. Settings → Secrets
3. Add: `SUPABASE_SERVICE_ROLE_KEY` = your service role key

## Option 3: Check Function Logs

Check logs in Supabase Dashboard:
1. Edge Functions → collect-outbreak-data
2. Click "Logs" tab
3. Look for execution logs and errors

