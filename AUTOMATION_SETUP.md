# Automated Data Collection Setup

## ✅ What's Been Configured

1. **Edge Function**: `collect-outbreak-data` is deployed and ready
2. **Database Function**: `trigger_collect_outbreak_data()` created
3. **Cron Job**: Scheduled to run **every 2 hours** automatically
4. **Settings Table**: `app_settings` created for secure key storage

## 🔑 Required: Set Service Role Key

The automated cron job needs your Supabase service role key to authenticate with the Edge Function.

### Option 1: Via SQL (Recommended)

Run this SQL in your Supabase SQL Editor:

```sql
INSERT INTO app_settings (key, value, description)
VALUES (
  'service_role_key', 
  'YOUR_SERVICE_ROLE_KEY_HERE', 
  'Service role key for Edge Function authentication'
)
ON CONFLICT (key) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = now();
```

**Where to find your Service Role Key:**
1. Go to Supabase Dashboard → Your Project
2. Settings → API
3. Copy the `service_role` key (keep this secret!)

### Option 2: Via Supabase Dashboard

1. Go to Table Editor → `app_settings`
2. Insert new row:
   - `key`: `service_role_key`
   - `value`: `YOUR_SERVICE_ROLE_KEY_HERE`
   - `description`: `Service role key for Edge Function auth`

## ⏰ Cron Schedule

The job runs **every 2 hours** at:
- 00:00 (midnight)
- 02:00 (2 AM)
- 04:00 (4 AM)
- 06:00 (6 AM)
- 08:00 (8 AM)
- 10:00 (10 AM)
- 12:00 (noon)
- 14:00 (2 PM)
- 16:00 (4 PM)
- 18:00 (6 PM)
- 20:00 (8 PM)
- 22:00 (10 PM)

## 📊 Verify It's Working

### Check Cron Job Status

```sql
SELECT 
  jobname,
  schedule,
  active,
  jobid
FROM cron.job
WHERE jobname = 'collect-outbreak-data-auto';
```

### Check Recent Executions

```sql
SELECT 
  runid,
  jobid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'collect-outbreak-data-auto')
ORDER BY start_time DESC
LIMIT 10;
```

### Check New Outbreak Signals

After the first run, check for new data:

```sql
SELECT 
  os.id,
  d.name as disease,
  c.name as country,
  os.detected_at,
  os.confidence_score
FROM outbreak_signals os
JOIN diseases d ON d.id = os.disease_id
LEFT JOIN countries c ON c.id = os.country_id
ORDER BY os.detected_at DESC
LIMIT 10;
```

### Check Function Logs

1. Go to Supabase Dashboard → Edge Functions
2. Click on `collect-outbreak-data`
3. View "Logs" tab to see execution details

## 🔧 Troubleshooting

### Cron Job Not Running

1. **Check if pg_cron is enabled:**
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```

2. **Check if job is active:**
   ```sql
   SELECT active FROM cron.job WHERE jobname = 'collect-outbreak-data-auto';
   ```

3. **Check for errors:**
   ```sql
   SELECT return_message, status 
   FROM cron.job_run_details 
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'collect-outbreak-data-auto')
   ORDER BY start_time DESC 
   LIMIT 1;
   ```

### Service Role Key Issues

If you see warnings about service role key:
1. Verify the key is in `app_settings` table
2. Check the key is correct (no extra spaces)
3. Ensure the key has proper permissions

### Edge Function Not Responding

1. Check Edge Function status in Supabase Dashboard
2. View Edge Function logs for errors
3. Verify the function URL is correct
4. Test manually:
   ```bash
   curl -X POST https://mevpqgmyepfxexprjkft.supabase.co/functions/v1/collect-outbreak-data \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json"
   ```

## 📝 Modify Schedule

To change the schedule frequency, update the cron job:

```sql
-- Remove existing job
SELECT cron.unschedule('collect-outbreak-data-auto');

-- Add new schedule (example: every hour)
SELECT cron.schedule(
  'collect-outbreak-data-auto',
  '0 * * * *',  -- Every hour at :00 minutes
  $$SELECT trigger_collect_outbreak_data();$$
);

-- Or every 30 minutes
SELECT cron.schedule(
  'collect-outbreak-data-auto',
  '*/30 * * * *',  -- Every 30 minutes
  $$SELECT trigger_collect_outbreak_data();$$
);
```

**Common Cron Patterns:**
- Every 2 hours: `0 */2 * * *`
- Every hour: `0 * * * *`
- Every 30 minutes: `*/30 * * * *`
- Every 6 hours: `0 */6 * * *`
- Daily at midnight: `0 0 * * *`

## 🔐 Security Notes

- **NEVER commit the service role key to git**
- Store it securely in Supabase's vault or environment variables
- The `app_settings` table has RLS enabled
- Consider using Supabase Vault for production

## 📈 Monitoring

To monitor the automation:

1. **Create a monitoring dashboard query:**
   ```sql
   -- Get last 24 hours of collection stats
   SELECT 
     DATE_TRUNC('hour', detected_at) as hour,
     COUNT(*) as signals_created,
     COUNT(DISTINCT disease_id) as unique_diseases,
     COUNT(DISTINCT country_id) as unique_countries
   FROM outbreak_signals
   WHERE detected_at > NOW() - INTERVAL '24 hours'
   GROUP BY hour
   ORDER BY hour DESC;
   ```

2. **Check article collection:**
   ```sql
   SELECT 
     DATE_TRUNC('hour', scraped_at) as hour,
     COUNT(*) as articles_collected,
     COUNT(DISTINCT source_id) as sources
   FROM news_articles
   WHERE scraped_at > NOW() - INTERVAL '24 hours'
   GROUP BY hour
   ORDER BY hour DESC;
   ```

---

**Status**: ✅ Automated data collection is set up and ready!
**Next Step**: Insert your service role key into `app_settings` table to activate.

