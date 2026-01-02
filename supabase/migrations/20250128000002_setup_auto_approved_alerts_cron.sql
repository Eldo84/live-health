/*
  # Auto-Approved Alerts Processing - Cron Job Setup
  
  ## Overview
  Sets up an automated cron job that runs every 5 minutes to process auto-approved
  alert submissions and create outbreak signals.
  
  This serves as a backup to ensure auto-approved submissions are processed even
  if the frontend Edge Function call fails.
  
  ## Changes
  1. Creates function to trigger process-auto-approved-alerts Edge Function
  2. Schedules cron job to run every 5 minutes
*/

-- Ensure extensions are enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Ensure app_settings table exists
CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now()
);

-- Function to trigger process-auto-approved-alerts Edge Function
CREATE OR REPLACE FUNCTION trigger_process_auto_approved_alerts()
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
    RAISE WARNING 'Service role key not configured. Auto-approved alerts processing cron job will not work until key is set in app_settings table.';
    RETURN;
  END IF;
  
  -- Make HTTP request to Edge Function
  SELECT net.http_post(
    url := supabase_url || '/functions/v1/process-auto-approved-alerts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key,
      'apikey', service_key
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000  -- 1 minute timeout (should be enough)
  ) INTO response_id;
  
  -- Log success
  RAISE NOTICE 'Auto-approved alerts Edge Function triggered via cron. Request ID: %', response_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to trigger process-auto-approved-alerts Edge Function: %', SQLERRM;
END;
$$;

-- Remove existing cron job if it exists
SELECT cron.unschedule('process-auto-approved-alerts-auto') 
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-auto-approved-alerts-auto'
);

-- Schedule cron job to run every 5 minutes
-- Cron format: '*/5 * * * *' means every 5 minutes
SELECT cron.schedule(
  'process-auto-approved-alerts-auto',
  '*/5 * * * *',  -- Every 5 minutes
  $$SELECT trigger_process_auto_approved_alerts();$$
);

-- Add comments
COMMENT ON FUNCTION trigger_process_auto_approved_alerts() IS 
  'Triggers the process-auto-approved-alerts Edge Function. Called automatically every 5 minutes by pg_cron. Processes auto-approved alert submissions and creates outbreak signals.';

