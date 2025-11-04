/*
  # Fix Cron Job Timeout Issue

  ## Problem
  The pg_net HTTP request was using the default 2-second timeout, but the edge function
  takes 80-90 seconds to complete. This caused all requests to timeout silently.

  ## Solution
  Increase the timeout_milliseconds parameter to 180000 (3 minutes) to allow
  the edge function to complete successfully.
*/

-- Update the function to use a longer timeout (3 minutes = 180000ms)
CREATE OR REPLACE FUNCTION trigger_collect_outbreak_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  service_key text;
  response_id bigint;
BEGIN
  -- Get service role key from settings table
  SELECT value INTO service_key
  FROM app_settings
  WHERE key = 'service_role_key'
  LIMIT 1;
  
  -- If not configured, log warning and return
  IF service_key IS NULL OR service_key = '' THEN
    RAISE WARNING 'Service role key not configured in app_settings table. Cron job will not work until key is set.';
    RETURN;
  END IF;
  
  -- Make HTTP request to Edge Function with extended timeout (3 minutes)
  -- NOTE: net.http_post() returns bigint directly, not a row
  -- The edge function takes 80-90 seconds, so we need at least 120 seconds
  SELECT net.http_post(
    url := 'https://mevpqgmyepfxexprjkft.supabase.co/functions/v1/collect-outbreak-data',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 180000  -- 3 minutes timeout (edge function takes ~90 seconds)
  ) INTO response_id;
  
  -- Log success
  RAISE NOTICE 'Edge Function triggered via cron. Request ID: %', response_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to trigger Edge Function: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION trigger_collect_outbreak_data() IS 
  'Triggers the collect-outbreak-data Edge Function with 3-minute timeout. Called automatically every 2 hours by pg_cron.';

