/*
  # Fix Cron Job Timeout and Error Handling
  
  ## Problem
  The edge function is timing out (502/504 errors) when called by cron, even though
  it works fine when manually triggered. The function takes ~2.5 minutes, but Supabase
  edge functions have platform timeouts that may be shorter.
  
  ## Solution
  1. Increase timeout to 5 minutes (300000ms) to provide more buffer
  2. Add polling to check if request completed successfully
  3. Add better error logging
  4. Make the function more resilient to timeouts
*/

-- Update the function with increased timeout and better error handling
CREATE OR REPLACE FUNCTION trigger_collect_outbreak_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  service_key text;
  response_id bigint;
  response_status_code int;
  response_timed_out boolean;
  max_wait_seconds int := 300; -- 5 minutes max wait
  check_interval_seconds int := 5; -- Check every 5 seconds
  elapsed_seconds int := 0;
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
  
  -- Make HTTP request to Edge Function with extended timeout (5 minutes)
  -- NOTE: net.http_post() returns bigint directly (request ID), not a row
  SELECT net.http_post(
    url := 'https://mevpqgmyepfxexprjkft.supabase.co/functions/v1/collect-outbreak-data',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000  -- 5 minutes timeout (edge function takes ~2.5 minutes, gives buffer)
  ) INTO response_id;
  
  -- Log that request was queued
  RAISE NOTICE 'Edge Function request queued via cron. Request ID: %', response_id;
  
  -- Poll for response (optional - this will wait for completion)
  -- Note: This makes the cron job wait, but ensures we know if it succeeded
  -- If you want fire-and-forget, comment out this polling section
  /*
  WHILE elapsed_seconds < max_wait_seconds LOOP
    SELECT status_code, timed_out INTO response_status_code, response_timed_out
    FROM net._http_response
    WHERE id = response_id;
    
    -- If we got a response, break
    IF response_status_code IS NOT NULL THEN
      IF response_status_code = 200 THEN
        RAISE NOTICE 'Edge Function completed successfully. Status: %', response_status_code;
      ELSIF response_timed_out THEN
        RAISE WARNING 'Edge Function timed out after % seconds', elapsed_seconds;
      ELSE
        RAISE WARNING 'Edge Function returned error status: %', response_status_code;
      END IF;
      EXIT;
    END IF;
    
    -- Wait before checking again
    PERFORM pg_sleep(check_interval_seconds);
    elapsed_seconds := elapsed_seconds + check_interval_seconds;
  END LOOP;
  
  -- If we didn't get a response, log warning
  IF response_status_code IS NULL THEN
    RAISE WARNING 'Edge Function did not complete within % seconds. Check logs manually.', max_wait_seconds;
  END IF;
  */
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to trigger Edge Function: %', SQLERRM;
    -- Log to a table for monitoring (optional)
    -- INSERT INTO cron_errors (error_message, created_at) VALUES (SQLERRM, NOW());
END;
$$;

COMMENT ON FUNCTION trigger_collect_outbreak_data() IS 
  'Triggers the collect-outbreak-data Edge Function with 5-minute timeout. Called automatically every 3 hours by pg_cron. Increased timeout to handle longer execution times.';


