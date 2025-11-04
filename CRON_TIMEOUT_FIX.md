# Cron Job Timeout Fix

## 🔍 Problem Identified

The cron job was running successfully, but the edge function wasn't being triggered. After investigation, the root cause was:

**The HTTP request from pg_net was timing out after 2 seconds (default), while the edge function takes 80-90 seconds to complete.**

### Symptoms:
- ✅ Cron job was executing successfully (status: "succeeded")
- ✅ pg_cron scheduler was running
- ✅ pg_net worker was running  
- ❌ No HTTP responses in `net._http_response` table
- ❌ No edge function execution logs in the last 3 hours

### Root Cause:
The `trigger_collect_outbreak_data()` function was calling `net.http_post()` without specifying a `timeout_milliseconds` parameter, defaulting to 2000ms (2 seconds). Since the edge function needs 80-90 seconds to:
- Fetch data from Google Sheets
- Fetch news from WHO and Google News
- Process and geocode locations
- Store data in the database

All HTTP requests were timing out before the edge function could complete.

## ✅ Solution Applied

**Migration:** `20251103133000_fix_cron_timeout.sql`

Updated the `trigger_collect_outbreak_data()` function to use a 3-minute (180000ms) timeout:

```sql
SELECT id INTO response_id
FROM net.http_post(
  url := 'https://mevpqgmyepfxexprjkft.supabase.co/functions/v1/collect-outbreak-data',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || service_key
  ),
  body := '{}'::jsonb,
  timeout_milliseconds := 180000  -- 3 minutes (edge function takes ~90 seconds)
);
```

## 📊 Verification

### Check if the fix is working:

1. **Monitor HTTP responses:**
   ```sql
   SELECT 
     id,
     status_code,
     timed_out,
     error_msg,
     created
   FROM net._http_response
   WHERE created > NOW() - INTERVAL '1 hour'
   ORDER BY created DESC;
   ```

2. **Check edge function logs:**
   - Go to Supabase Dashboard → Edge Functions → `collect-outbreak-data`
   - View the "Logs" tab
   - You should see new executions after the next cron run

3. **Monitor cron job execution:**
   ```sql
   SELECT 
     runid,
     start_time,
     end_time,
     status,
     return_message
   FROM cron.job_run_details
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'collect-outbreak-data-auto')
     AND start_time > NOW() - INTERVAL '24 hours'
   ORDER BY start_time DESC;
   ```

## ⏰ Next Steps

The next cron job will run at the scheduled time (every 2 hours at :00 minutes). You should now see:
- ✅ HTTP responses in `net._http_response` table (status_code: 200)
- ✅ Edge function execution logs
- ✅ New outbreak signals in the database

## 🔍 Debugging Queries

If you want to manually test:

```sql
-- Test the function manually
SELECT trigger_collect_outbreak_data();

-- Wait ~90 seconds, then check response
SELECT 
  id,
  status_code,
  timed_out,
  error_msg,
  content,
  created
FROM net._http_response
ORDER BY created DESC
LIMIT 1;
```

## 📝 Notes

- The timeout is set to 3 minutes (180000ms) to provide a safety margin
- Edge function execution time: ~80-90 seconds typically
- pg_net responses are stored for 6 hours by default
- The function is asynchronous - responses appear after the HTTP request completes


