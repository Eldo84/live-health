/*
  # Update Auto-Approved Alerts Cron Schedule
  
  ## Overview
  Changes the cron job schedule from every 5 minutes to every 5 hours.
  
  ## Changes
  - Updates cron schedule from '*/5 * * * *' (every 5 minutes) to '0 */5 * * *' (every 5 hours)
*/

-- Remove existing cron job
SELECT cron.unschedule('process-auto-approved-alerts-auto') 
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-auto-approved-alerts-auto'
);

-- Schedule cron job to run every 5 hours
-- Cron format: '0 */5 * * *' means at minute 0 of every 5th hour (00:00, 05:00, 10:00, 15:00, 20:00)
SELECT cron.schedule(
  'process-auto-approved-alerts-auto',
  '0 */5 * * *',  -- Every 5 hours at :00 minutes
  $$SELECT trigger_process_auto_approved_alerts();$$
);

-- Update comment
COMMENT ON FUNCTION trigger_process_auto_approved_alerts() IS 
  'Triggers the process-auto-approved-alerts Edge Function. Called automatically every 5 hours by pg_cron. Processes auto-approved alert submissions and creates outbreak signals.';

