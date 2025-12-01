-- Migration: Split outbreak data collection into two functions
-- 
-- This migration:
-- 1. Disables the old collect-outbreak-data cron job
-- 2. Creates two new cron jobs:
--    - collect-authoritative-sources: Every 3 hours at :00 (WHO, CDC, BBC, etc.)
--    - collect-multilingual-news: Every 3 hours at :30 (Google News in 10 languages)
--
-- Benefits:
-- - Authoritative sources processed faster (no translation overhead)
-- - All 10 languages processed every run (no rotation delay)
-- - Better error isolation between source types
-- - Offset schedules avoid API rate limit conflicts

-- First, check if pg_cron extension exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  END IF;
END $$;

-- First, check if pg_net extension exists (for HTTP calls)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    CREATE EXTENSION IF NOT EXISTS pg_net;
  END IF;
END $$;

-- Disable the old collect-outbreak-data cron job (if it exists)
-- We keep it around for rollback purposes
DO $$
BEGIN
  -- Try to unschedule the old job
  PERFORM cron.unschedule('collect-outbreak-data-auto');
EXCEPTION WHEN OTHERS THEN
  -- Job might not exist, that's okay
  RAISE NOTICE 'Old cron job collect-outbreak-data-auto not found, skipping...';
END $$;

-- Create new cron job for authoritative sources (runs at :00)
-- Every 3 hours: 00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00
DO $$
DECLARE
  supabase_url text;
  service_key text;
BEGIN
  -- Get Supabase URL from current database settings
  SELECT current_setting('app.settings.supabase_url', true) INTO supabase_url;
  SELECT current_setting('app.settings.supabase_service_role_key', true) INTO service_key;
  
  -- If settings not available, use environment-based approach
  IF supabase_url IS NULL OR supabase_url = '' THEN
    -- Schedule the job to call the edge function
    PERFORM cron.schedule(
      'collect-authoritative-sources-auto',
      '0 */3 * * *',  -- Every 3 hours at :00
      $$
      SELECT net.http_post(
        url := current_setting('supabase.url') || '/functions/v1/collect-authoritative-sources',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('supabase.service_key'),
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 300000  -- 5 minute timeout
      );
      $$
    );
  ELSE
    PERFORM cron.schedule(
      'collect-authoritative-sources-auto',
      '0 */3 * * *',
      format(
        'SELECT net.http_post(
          url := %L || ''/functions/v1/collect-authoritative-sources'',
          headers := jsonb_build_object(
            ''Authorization'', ''Bearer '' || %L,
            ''Content-Type'', ''application/json''
          ),
          body := ''{}''::jsonb,
          timeout_milliseconds := 300000
        );',
        supabase_url, service_key
      )
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create collect-authoritative-sources-auto cron job: %', SQLERRM;
END $$;

-- Create new cron job for multilingual news (runs at :30)
-- Every 3 hours offset: 00:30, 03:30, 06:30, 09:30, 12:30, 15:30, 18:30, 21:30
DO $$
DECLARE
  supabase_url text;
  service_key text;
BEGIN
  SELECT current_setting('app.settings.supabase_url', true) INTO supabase_url;
  SELECT current_setting('app.settings.supabase_service_role_key', true) INTO service_key;
  
  IF supabase_url IS NULL OR supabase_url = '' THEN
    PERFORM cron.schedule(
      'collect-multilingual-news-auto',
      '30 */3 * * *',  -- Every 3 hours at :30
      $$
      SELECT net.http_post(
        url := current_setting('supabase.url') || '/functions/v1/collect-multilingual-news',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('supabase.service_key'),
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 300000  -- 5 minute timeout
      );
      $$
    );
  ELSE
    PERFORM cron.schedule(
      'collect-multilingual-news-auto',
      '30 */3 * * *',
      format(
        'SELECT net.http_post(
          url := %L || ''/functions/v1/collect-multilingual-news'',
          headers := jsonb_build_object(
            ''Authorization'', ''Bearer '' || %L,
            ''Content-Type'', ''application/json''
          ),
          body := ''{}''::jsonb,
          timeout_milliseconds := 300000
        );',
        supabase_url, service_key
      )
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create collect-multilingual-news-auto cron job: %', SQLERRM;
END $$;

-- Add new news sources for the newly added feeds (if they don't exist)
INSERT INTO news_sources (name, base_url, type, trust_score, is_active)
VALUES
  ('CDC MMWR', 'https://www.cdc.gov/mmwr/', 'government', 0.95, true),
  ('ReliefWeb', 'https://reliefweb.int/', 'international_org', 0.90, true),
  ('UK Health Security Agency', 'https://www.gov.uk/government/organisations/uk-health-security-agency', 'government', 0.90, true),
  ('STAT News', 'https://www.statnews.com/', 'news', 0.80, true),
  ('Contagion Live', 'https://www.contagionlive.com/', 'news', 0.75, true),
  ('NPR Health', 'https://www.npr.org/sections/health/', 'news', 0.80, true)
ON CONFLICT (name) DO NOTHING;

-- Log the migration
DO $$
BEGIN
  RAISE NOTICE 'Migration complete: Split outbreak collection into two functions';
  RAISE NOTICE 'New cron jobs created:';
  RAISE NOTICE '  - collect-authoritative-sources-auto: Every 3 hours at :00';
  RAISE NOTICE '  - collect-multilingual-news-auto: Every 3 hours at :30';
END $$;

