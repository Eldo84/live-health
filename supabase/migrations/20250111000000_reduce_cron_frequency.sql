/*
  # Reduce Cron Job Frequency to Save Bandwidth
  
  ## Problem
  The cron job runs every 2 hours (12 times per day), which contributes to high egress usage.
  The edge function fetches RSS feeds, makes AI API calls, and returns responses that count as egress.
  
  ## Solution
  Reduce cron frequency from every 2 hours to every 6 hours (4 times per day).
  This reduces edge function calls by 67% while still keeping data reasonably fresh.
*/

-- Remove existing cron job
SELECT cron.unschedule('collect-outbreak-data-auto') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'collect-outbreak-data-auto'
);

-- Schedule cron job to run every 6 hours instead of every 2 hours
-- Cron format: '0 */6 * * *' means at minute 0 of every 6th hour (00:00, 06:00, 12:00, 18:00)
SELECT cron.schedule(
  'collect-outbreak-data-auto',
  '0 */6 * * *',
  $$SELECT trigger_collect_outbreak_data();$$
);

-- Update comment
COMMENT ON FUNCTION trigger_collect_outbreak_data() IS 
  'Triggers the collect-outbreak-data Edge Function with 3-minute timeout. Called automatically every 6 hours by pg_cron (reduced from 2 hours to save bandwidth).';

