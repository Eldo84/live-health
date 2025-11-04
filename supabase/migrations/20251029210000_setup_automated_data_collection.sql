/*
  # Automated Data Collection Setup

  ## Overview
  Sets up automated data collection that runs every 2 hours using pg_cron.

  ## Changes
  1. Creates function to trigger Edge Function
  2. Creates settings table for service role key
  3. Schedules cron job to run every 2 hours

  ## Instructions
  After running this migration, you MUST:
  1. Insert your service role key into app_settings table:
     INSERT INTO app_settings (key, value, description)
     VALUES ('service_role_key', 'YOUR_SERVICE_ROLE_KEY_HERE', 'Service role key for Edge Function auth');
  
  2. The cron job will then automatically run every 2 hours.
*/

-- Enable extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create settings table for storing service role key
CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage settings
DROP POLICY IF EXISTS "Service role can manage settings" ON app_settings;
CREATE POLICY "Service role can manage settings"
  ON app_settings FOR ALL
  USING (true);

-- Create function to trigger Edge Function
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

-- Remove existing cron job if it exists
SELECT cron.unschedule('collect-outbreak-data-auto') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'collect-outbreak-data-auto'
);

-- Schedule cron job to run every 2 hours
-- Cron format: '0 */2 * * *' means at minute 0 of every 2nd hour (00:00, 02:00, 04:00, etc.)
SELECT cron.schedule(
  'collect-outbreak-data-auto',
  '0 */2 * * *',
  $$SELECT trigger_collect_outbreak_data();$$
);

-- Add comment
COMMENT ON FUNCTION trigger_collect_outbreak_data() IS 
  'Triggers the collect-outbreak-data Edge Function. Called automatically every 2 hours by pg_cron.';

COMMENT ON TABLE app_settings IS 
  'Stores application settings including service role key for Edge Function authentication.';

