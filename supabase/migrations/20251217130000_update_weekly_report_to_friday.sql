-- ============================================================================
-- Update Weekly Report Cron Job to Run on Friday Instead of Monday
-- ============================================================================
-- 
-- Changes the schedule from Monday 8:00 AM UTC to Friday 8:00 AM UTC
-- ============================================================================

-- Remove existing cron job
SELECT cron.unschedule('weekly-top-diseases-auto') 
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'weekly-top-diseases-auto'
);

-- Schedule cron job to run every Friday at 8:00 AM UTC
-- Cron format: '0 8 * * 5' means at 08:00 UTC every Friday
-- Day of week: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
SELECT cron.schedule(
  'weekly-top-diseases-auto',
  '0 8 * * 5',  -- Every Friday at 8:00 AM UTC
  $$SELECT trigger_weekly_top_diseases();$$
);

-- Update function comment
COMMENT ON FUNCTION trigger_weekly_top_diseases() IS 
  'Triggers the weekly-top-diseases Edge Function. Called automatically every Friday at 8:00 AM UTC by pg_cron. Sends weekly top 10 diseases notifications to all users.';



























