-- Per-user location + alert preferences, and a dedup log for dispatched alerts.
-- Backs the "outbreak alerts near you" feature (in-app + email).

create table if not exists public.user_alert_preferences (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references auth.users(id) on delete cascade,
  latitude      numeric,
  longitude     numeric,
  country       text,
  country_code  text,
  city          text,
  radius_km     integer not null default 250 check (radius_km between 10 and 5000),
  alerts_enabled boolean not null default true,
  email_enabled boolean not null default false,
  min_severity  text not null default 'high'
                check (min_severity in ('low','medium','high','critical')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.user_alert_preferences enable row level security;

do $$ begin
  create policy "own prefs - select" on public.user_alert_preferences
    for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "own prefs - insert" on public.user_alert_preferences
    for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "own prefs - update" on public.user_alert_preferences
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "own prefs - delete" on public.user_alert_preferences
    for delete using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

create index if not exists idx_user_alert_prefs_enabled
  on public.user_alert_preferences (alerts_enabled) where alerts_enabled;

create or replace function public.touch_user_alert_preferences()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_touch_user_alert_prefs on public.user_alert_preferences;
create trigger trg_touch_user_alert_prefs
  before update on public.user_alert_preferences
  for each row execute function public.touch_user_alert_preferences();

-- Dedup log: one row per (user, signal) so a user is alerted once per outbreak.
create table if not exists public.location_alert_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  signal_id   uuid not null references public.outbreak_signals(id) on delete cascade,
  emailed     boolean not null default false,
  notified_at timestamptz not null default now(),
  unique (user_id, signal_id)
);

alter table public.location_alert_log enable row level security;

do $$ begin
  create policy "own alert log - select" on public.location_alert_log
    for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

create index if not exists idx_location_alert_log_signal
  on public.location_alert_log (signal_id);

-- Extend the notification type whitelist with 'location_alert'
-- (preserving all pre-existing values, incl. weekly_top_diseases).
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type = any (array[
    'submission_created','submission_approved','submission_rejected',
    'payment_required','payment_received','ad_live','ad_expiring','ad_expired',
    'alert_approved','alert_rejected','admin_broadcast','weekly_top_diseases',
    'location_alert'
  ]));
