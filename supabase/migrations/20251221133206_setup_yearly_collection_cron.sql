/*
  # Yearly Health Data Collection Automation
  
  ## Overview
  Sets up automated yearly health data collection that runs on Dec 31 at 3 AM.
  Also provides manual trigger function for backfilling missing years (2021-2024).
  
  ## Changes
  1. Creates function to check collection_log for missing years
  2. Creates function to trigger collect-health-statistics Edge Function
  3. Schedules cron job: Dec 31 at 3 AM (0 3 31 12 *)
  4. Provides manual trigger function for backfilling
  
  ## Instructions
  After running this migration:
  1. Ensure service role key is set in app_settings table (if not already set)
  2. The cron job will automatically run on Dec 31 at 3 AM each year
  3. To manually trigger for backfilling, call: SELECT run_yearly_health_collection();
*/

-- Enable extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Ensure app_settings table exists (from previous migration)
CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now()
);

-- Function to get Supabase URL (from environment or settings)
CREATE OR REPLACE FUNCTION get_supabase_url()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  url text;
BEGIN
  -- Try to get from settings table first
  SELECT value INTO url
  FROM app_settings
  WHERE key = 'supabase_url'
  LIMIT 1;
  
  -- If not in settings, use default (should be set via environment variable in production)
  IF url IS NULL OR url = '' THEN
    -- Default to common Supabase pattern - should be overridden in production
    url := 'https://mevpqgmyepfxexprjkft.supabase.co';
  END IF;
  
  RETURN url;
END;
$$;

-- Function to check for missing years in collection_log
CREATE OR REPLACE FUNCTION get_missing_years()
RETURNS int[]
LANGUAGE plpgsql
AS $$
DECLARE
  missing_years int[];
  current_year int;
  year_to_check int;
BEGIN
  current_year := EXTRACT(YEAR FROM now())::int;
  missing_years := ARRAY[]::int[];
  
  -- Check years from 2021 to current year
  FOR year_to_check IN 2021..current_year LOOP
    -- Check if year exists in collection_log and is not collected
    IF NOT EXISTS (
      SELECT 1 FROM collection_log 
      WHERE year = year_to_check AND collected = true
    ) THEN
      missing_years := array_append(missing_years, year_to_check);
    END IF;
  END LOOP;
  
  RETURN missing_years;
END;
$$;

-- Main function to run yearly health collection
CREATE OR REPLACE FUNCTION run_yearly_health_collection()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  service_key text;
  supabase_url text;
  response_id bigint;
  missing_years int[];
  years_to_collect int[];
  current_year int;
  result jsonb;
BEGIN
  -- Get service role key from settings table
  SELECT value INTO service_key
  FROM app_settings
  WHERE key = 'service_role_key'
  LIMIT 1;
  
  -- If not configured, log warning and return
  IF service_key IS NULL OR service_key = '' THEN
    RAISE WARNING 'Service role key not configured in app_settings table. Please set it first.';
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Service role key not configured'
    );
  END IF;
  
  -- Get Supabase URL
  supabase_url := get_supabase_url();
  
  -- Get missing years
  missing_years := get_missing_years();
  
  -- If no missing years, check if we should collect current year
  current_year := EXTRACT(YEAR FROM now())::int;
  
  IF array_length(missing_years, 1) IS NULL THEN
    -- No missing years, but check if current year needs collection
    -- (e.g., if it's Dec 31 and we haven't collected yet)
    IF NOT EXISTS (
      SELECT 1 FROM collection_log 
      WHERE year = current_year AND collected = true
    ) THEN
      years_to_collect := ARRAY[current_year];
    ELSE
      RETURN jsonb_build_object(
        'success', true,
        'message', 'All years have been collected',
        'missing_years', '[]'::jsonb
      );
    END IF;
  ELSE
    years_to_collect := missing_years;
  END IF;
  
  -- Make HTTP request to Edge Function
  SELECT net.http_post(
    url := supabase_url || '/functions/v1/collect-health-statistics',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := jsonb_build_object(
      'years', years_to_collect,
      'forceRefresh', false
    ),
    timeout_milliseconds := 600000  -- 10 minutes timeout (collection can take time)
  ) INTO response_id;
  
  -- Log success
  RAISE NOTICE 'Health statistics collection triggered via cron. Request ID: %, Years: %', 
    response_id, array_to_string(years_to_collect, ', ');
  
  result := jsonb_build_object(
    'success', true,
    'request_id', response_id,
    'years_collected', years_to_collect,
    'message', 'Collection triggered for years: ' || array_to_string(years_to_collect, ', ')
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to trigger health statistics collection: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Function specifically for year-end automation (Dec 31)
CREATE OR REPLACE FUNCTION trigger_yearly_health_collection()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- This function is called by cron on Dec 31
  -- It will collect data for the current year
  result := run_yearly_health_collection();
  
  IF (result->>'success')::boolean = false THEN
    RAISE WARNING 'Yearly health collection failed: %', result->>'error';
  END IF;
END;
$$;

-- Remove existing cron job if it exists
SELECT cron.unschedule('yearly-health-collection') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'yearly-health-collection'
);

-- Schedule cron job: Dec 31 at 3 AM (0 3 31 12 *)
SELECT cron.schedule(
  'yearly-health-collection',
  '0 3 31 12 *',  -- Dec 31 at 3:00 AM
  $$SELECT trigger_yearly_health_collection();$$
);

-- Add comments for documentation
COMMENT ON FUNCTION run_yearly_health_collection() IS 
  'Main function to trigger health statistics collection. Checks collection_log for missing years and triggers collect-health-statistics Edge Function. Can be called manually for backfilling.';

COMMENT ON FUNCTION trigger_yearly_health_collection() IS 
  'Year-end automation function. Called automatically on Dec 31 at 3 AM by pg_cron.';

COMMENT ON FUNCTION get_missing_years() IS 
  'Returns array of years (2021-current) that have not been collected yet according to collection_log.';

-- Example: Manual trigger for backfilling 2021-2024
-- SELECT run_yearly_health_collection();


























