-- =====================================================
-- Google Trends Data Storage for Disease Tracking
-- =====================================================
-- This table stores pre-fetched Google Trends data for 20 tracked diseases.
-- Data is collected weekly via GitHub Actions and stored here for fast access.
-- Frontend fetches from this table instead of calling Google Trends directly.

-- 1. Create the google_trends table
create table public.google_trends (
  id bigint generated always as identity primary key,
  disease text not null,
  date date not null,
  interest_value int not null check (interest_value >= 0 and interest_value <= 100),
  collected_at timestamptz default now(),
  
  -- Prevent duplicate entries (one value per disease per day)
  unique(disease, date)
);

-- 2. Add comment for documentation
comment on table public.google_trends is 'Stores Google Trends interest data for 20 tracked diseases. Collected weekly via automated Python script.';
comment on column public.google_trends.disease is 'Disease name as searched in Google Trends';
comment on column public.google_trends.date is 'Date of the trend data point';
comment on column public.google_trends.interest_value is 'Google Trends interest score (0-100 scale)';
comment on column public.google_trends.collected_at is 'When this data was fetched from Google Trends';

-- 3. Create indexes for fast queries
create index idx_google_trends_disease on public.google_trends(disease);
create index idx_google_trends_date on public.google_trends(date desc);
create index idx_google_trends_disease_date on public.google_trends(disease, date desc);

-- 4. Enable Row Level Security
alter table public.google_trends enable row level security;

-- 5. Allow public read access (this data is not sensitive)
create policy "Allow public read access to google_trends"
  on public.google_trends
  for select
  using (true);

-- 6. Create RPC function for efficient multi-disease queries
create or replace function get_disease_trends(disease_names text[])
returns table (
  disease text,
  date date,
  interest_value int
)
language sql
stable
security definer
as $$
  select 
    gt.disease,
    gt.date,
    gt.interest_value
  from public.google_trends gt
  where gt.disease = any(disease_names)
  order by gt.disease, gt.date asc;
$$;

-- 7. Add comment for the function
comment on function get_disease_trends(text[]) is 'Retrieves Google Trends data for multiple diseases. Used by Disease Tracking component.';

-- 8. Grant execute permission to anonymous users
grant execute on function get_disease_trends(text[]) to anon;
grant execute on function get_disease_trends(text[]) to authenticated;

