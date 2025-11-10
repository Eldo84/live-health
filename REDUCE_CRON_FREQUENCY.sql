-- ============================================
-- REDUCE CRON JOB FREQUENCY TO SAVE BANDWIDTH
-- ============================================
-- This reduces the cron job from every 2 hours to every 6 hours
-- This will reduce edge function calls by 67% (from 12/day to 4/day)
--
-- INSTRUCTIONS:
-- 1. Copy this entire file
-- 2. Go to Supabase Dashboard → SQL Editor
-- 3. Paste and run this SQL
-- ============================================

-- Step 1: Remove existing cron job
SELECT cron.unschedule('collect-outbreak-data-auto') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'collect-outbreak-data-auto'
);

-- Step 2: Schedule new cron job to run every 6 hours
-- Schedule: 00:00, 06:00, 12:00, 18:00 (4 times per day)
SELECT cron.schedule(
  'collect-outbreak-data-auto',
  '0 */6 * * *',
  $$SELECT trigger_collect_outbreak_data();$$
);

-- Step 3: Update function comment
COMMENT ON FUNCTION trigger_collect_outbreak_data() IS 
  'Triggers the collect-outbreak-data Edge Function with 3-minute timeout. Called automatically every 6 hours by pg_cron (reduced from 2 hours to save bandwidth).';

-- Step 4: Verify the change
SELECT 
  jobname,
  schedule,
  active,
  jobid
FROM cron.job
WHERE jobname = 'collect-outbreak-data-auto';

-- Expected result:
-- jobname: collect-outbreak-data-auto
-- schedule: 0 */6 * * *
-- active: true

