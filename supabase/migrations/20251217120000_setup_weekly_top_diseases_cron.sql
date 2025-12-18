-- ============================================================================
-- Weekly Top Diseases Automated Notifications - Cron Job Setup
-- ============================================================================
-- 
-- This migration sets up an automated cron job that runs every Monday at 8:00 AM UTC
-- to send weekly top 10 diseases notifications to all users.
--
-- The cron job calls the weekly-top-diseases Edge Function using the service role key.
-- ============================================================================

-- Ensure extensions are enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create function to trigger weekly-top-diseases Edge Function
CREATE OR REPLACE FUNCTION trigger_weekly_top_diseases()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  service_key text;
  supabase_url text;
  response_id bigint;
BEGIN
  -- Get service role key from app_settings (if exists) or use environment
  SELECT value INTO service_key
  FROM app_settings
  WHERE key = 'service_role_key'
  LIMIT 1;
  
  -- Fallback: try to get from environment (Supabase sets this automatically)
  IF service_key IS NULL OR service_key = '' THEN
    -- Use service role key from environment (Supabase automatically sets this)
    -- For cron jobs, we'll use the service role key directly
    SELECT current_setting('app.settings.supabase_service_role_key', true) INTO service_key;
  END IF;
  
  -- Get Supabase URL
  SELECT value INTO supabase_url
  FROM app_settings
  WHERE key = 'supabase_url'
  LIMIT 1;
  
  IF supabase_url IS NULL OR supabase_url = '' THEN
    SELECT current_setting('app.settings.supabase_url', true) INTO supabase_url;
  END IF;
  
  -- Default to project URL if not found (you may need to update this)
  IF supabase_url IS NULL OR supabase_url = '' THEN
    supabase_url := 'https://mevpqgmyepfxexprjkft.supabase.co';
  END IF;
  
  -- If service key still not found, log warning
  IF service_key IS NULL OR service_key = '' THEN
    RAISE WARNING 'Service role key not configured. Weekly notifications cron job will not work until key is set in app_settings table.';
    RETURN;
  END IF;
  
  -- Make HTTP request to Edge Function
  -- Note: The edge function will use service role key internally, so we pass it as Authorization header
  SELECT net.http_post(
    url := supabase_url || '/functions/v1/weekly-top-diseases',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000  -- 5 minute timeout (should be enough for all users)
  ) INTO response_id;
  
  -- Log success
  RAISE NOTICE 'Weekly top diseases Edge Function triggered via cron. Request ID: %', response_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to trigger weekly-top-diseases Edge Function: %', SQLERRM;
END;
$$;

-- Remove existing cron job if it exists
SELECT cron.unschedule('weekly-top-diseases-auto') 
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'weekly-top-diseases-auto'
);

-- Schedule cron job to run every Monday at 8:00 AM UTC
-- Cron format: '0 8 * * 1' means at 08:00 UTC every Monday
-- To change schedule, modify the cron expression:
--   '0 8 * * 1' = Monday 8:00 AM UTC
--   '0 9 * * 1' = Monday 9:00 AM UTC
--   '0 8 * * 0' = Sunday 8:00 AM UTC
SELECT cron.schedule(
  'weekly-top-diseases-auto',
  '0 8 * * 1',  -- Every Monday at 8:00 AM UTC
  $$SELECT trigger_weekly_top_diseases();$$
);

-- Add comments
COMMENT ON FUNCTION trigger_weekly_top_diseases() IS 
  'Triggers the weekly-top-diseases Edge Function. Called automatically every Monday at 8:00 AM UTC by pg_cron. Sends weekly top 10 diseases notifications to all users.';

COMMENT ON TABLE app_settings IS 
  'Stores application settings including service role key for Edge Function authentication. Used by cron jobs.';

