# ✅ Automated Data Collection - ACTIVE

## Status: FULLY CONFIGURED AND ACTIVE

Your automated data collection system is now **fully operational**!

### What's Running:

1. **✅ Cron Job**: Scheduled to run every 2 hours
   - Schedule: `0 */2 * * *` (at :00 minutes of every 2nd hour)
   - Status: **ACTIVE**
   - Next runs: 00:00, 02:00, 04:00, 06:00, 08:00, 10:00, 12:00, 14:00, 16:00, 18:00, 20:00, 22:00

2. **✅ Service Role Key**: Stored securely in database
   - Key stored in `app_settings` table
   - Function can authenticate with Edge Function

3. **✅ Edge Function**: Deployed and ready
   - Function: `collect-outbreak-data`
   - Status: ACTIVE

4. **✅ Database Function**: Ready to trigger
   - Function: `trigger_collect_outbreak_data()`
   - Configured to call Edge Function with authentication

## 🔄 Automatic Process

Every 2 hours, this happens automatically:

1. **Cron Job Triggers** → Calls `trigger_collect_outbreak_data()`
2. **Database Function** → Makes HTTP request to Edge Function
3. **Edge Function** → Executes data collection:
   - Fetches keywords from Google Spreadsheet
   - Fetches news from WHO RSS and Google News
   - Matches articles to diseases
   - Extracts and geocodes locations
   - Stores articles and outbreak signals
4. **Database Updated** → New `outbreak_signals` created
5. **Map Updates** → Frontend automatically displays new data

## 📊 Monitoring

### Check Recent Data Collection:

```sql
-- See recent outbreak signals
SELECT 
  d.name as disease,
  c.name as country,
  os.detected_at,
  os.confidence_score,
  os.severity_assessment
FROM outbreak_signals os
JOIN diseases d ON d.id = os.disease_id
LEFT JOIN countries c ON c.id = os.country_id
ORDER BY os.detected_at DESC
LIMIT 20;

-- Count signals by hour (last 24 hours)
SELECT 
  DATE_TRUNC('hour', detected_at) as hour,
  COUNT(*) as signals_created
FROM outbreak_signals
WHERE detected_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

### Check Cron Job Execution:

```sql
-- View recent cron job runs
SELECT 
  runid,
  start_time,
  end_time,
  status,
  return_message
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'collect-outbreak-data-auto')
ORDER BY start_time DESC
LIMIT 10;
```

### Check News Articles Collected:

```sql
-- See recent articles
SELECT 
  ns.name as source,
  na.title,
  na.published_at,
  na.diseases_mentioned
FROM news_articles na
JOIN news_sources ns ON ns.id = na.source_id
ORDER BY na.scraped_at DESC
LIMIT 10;
```

## 🎯 Next Steps

1. **Wait for first run**: The cron job will run at the next scheduled time (check current hour)
2. **View on map**: Navigate to `/map` route to see outbreak signals
3. **Monitor**: Check the queries above to verify data is being collected

## 🔧 Manual Trigger (Optional)

If you want to trigger it immediately without waiting:

```sql
SELECT trigger_collect_outbreak_data();
```

Or via HTTP:

```bash
curl -X POST https://mevpqgmyepfxexprjkft.supabase.co/functions/v1/collect-outbreak-data \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ldnBxZ215ZXBmeGV4cHJqa2Z0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjA5NjIwMCwiZXhwIjoyMDc3NjcyMjAwfQ.sdFiD1-8lnya324YAavCNpN_LfntFsaNvCpDTTK4L-U" \
  -H "Content-Type: application/json"
```

## 📝 Schedule Customization

To change the frequency, update the cron schedule:

```sql
-- Remove current schedule
SELECT cron.unschedule('collect-outbreak-data-auto');

-- Add new schedule (example: every hour)
SELECT cron.schedule(
  'collect-outbreak-data-auto',
  '0 * * * *',  -- Every hour
  $$SELECT trigger_collect_outbreak_data();$$
);
```

## ✅ System Status

- **Automation**: ✅ ACTIVE
- **Edge Function**: ✅ DEPLOYED
- **Service Key**: ✅ CONFIGURED
- **Cron Job**: ✅ SCHEDULED
- **Database**: ✅ READY

**Your system will now automatically collect outbreak data every 2 hours!**

