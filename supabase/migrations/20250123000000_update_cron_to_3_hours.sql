/*
  # Update Cron Job to Run Every 3 Hours
  
  ## Changes
  Updates the cron schedule from every 6 hours to every 3 hours.
  
  ## Impact
  - Frequency: 8 runs per day (instead of 4)
  - Language Coverage: All 9 languages will be processed in 9 hours (instead of 18 hours)
  - Rotation: With 3 languages per run, we need 3 runs to cover all 9 languages
    - Run 0: en, fr, es
    - Run 1: ar, de, pt  
    - Run 2: it, ru, ja
    - Run 3: back to en, fr, es (cycle repeats)
  
  ## Schedule
  Runs at: 00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00 UTC
  Cron format: 0 */3 * * * means at minute 0 of every 3rd hour
*/

-- Remove existing cron job
SELECT cron.unschedule('collect-outbreak-data-auto') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'collect-outbreak-data-auto'
);

-- Schedule cron job to run every 3 hours
-- Cron format: 0 */3 * * * means at minute 0 of every 3rd hour
SELECT cron.schedule(
  'collect-outbreak-data-auto',
  '0 */3 * * *',
  $$SELECT trigger_collect_outbreak_data();$$
);

-- Update comment
COMMENT ON FUNCTION trigger_collect_outbreak_data() IS 
  'Triggers the collect-outbreak-data Edge Function with 3-minute timeout. Called automatically every 3 hours by pg_cron (updated from 6 hours for faster language rotation).';

