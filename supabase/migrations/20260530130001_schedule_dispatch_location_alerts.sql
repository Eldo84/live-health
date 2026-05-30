-- Run the location-alert dispatcher every 15 minutes via pg_cron + pg_net.
-- Auth uses the service_role_key stored in the app_settings table — the same
-- pattern the existing collection / auto-approve cron jobs rely on.

select cron.unschedule('dispatch-location-alerts-15m')
where exists (select 1 from cron.job where jobname = 'dispatch-location-alerts-15m');

select cron.schedule(
  'dispatch-location-alerts-15m',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := coalesce(
      (select value from public.app_settings where key = 'supabase_url' limit 1),
      'https://mevpqgmyepfxexprjkft.supabase.co'
    ) || '/functions/v1/dispatch-location-alerts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select value from public.app_settings where key = 'service_role_key' limit 1),
      'apikey', (select value from public.app_settings where key = 'service_role_key' limit 1)
    ),
    body := jsonb_build_object('windowHours', 1),
    timeout_milliseconds := 60000
  );
  $$
);
