-- =====================================================
-- Google Trends Region-Based Popularity Data Storage
-- =====================================================
-- This table stores pre-fetched Google Trends region popularity data for 20 tracked diseases.
-- Data is collected weekly via GitHub Actions and stored here for fast access.
-- Shows where search terms were most popular during specified time frames (0-100 scale).

-- 1. Create the google_trends_regions table
create table public.google_trends_regions (
  id bigint generated always as identity primary key,
  disease text not null,
  region text not null,
  region_code text, -- ISO country code if available (optional, for better matching)
  popularity_score int not null check (popularity_score >= 0 and popularity_score <= 100),
  date date not null,
  collected_at timestamptz default now(),
  
  -- Prevent duplicate entries (one value per disease per region per day)
  unique(disease, region, date)
);

-- 2. Add comments for documentation
comment on table public.google_trends_regions is 'Stores Google Trends region popularity data for 20 tracked diseases. Collected weekly via automated Python script. Shows where search terms were most popular (0-100 scale).';
comment on column public.google_trends_regions.disease is 'Disease name as searched in Google Trends';
comment on column public.google_trends_regions.region is 'Country/region name (e.g., "United States", "Brazil")';
comment on column public.google_trends_regions.region_code is 'ISO country code if available (optional, for better matching)';
comment on column public.google_trends_regions.popularity_score is 'Google Trends popularity score (0-100 scale). 100 = location with highest popularity as fraction of total searches. 0 = insufficient data.';
comment on column public.google_trends_regions.date is 'Date of the trend data point';
comment on column public.google_trends_regions.collected_at is 'When this data was fetched from Google Trends';

-- 3. Create indexes for fast queries
create index idx_google_trends_regions_disease on public.google_trends_regions(disease);
create index idx_google_trends_regions_date on public.google_trends_regions(date desc);
create index idx_google_trends_regions_disease_date on public.google_trends_regions(disease, date desc);
create index idx_google_trends_regions_region on public.google_trends_regions(region);
create index idx_google_trends_regions_disease_region_date on public.google_trends_regions(disease, region, date desc);

-- 4. Enable Row Level Security
alter table public.google_trends_regions enable row level security;

-- 5. Allow public read access (this data is not sensitive)
create policy "Allow public read access to google_trends_regions"
  on public.google_trends_regions
  for select
  using (true);

-- 6. Create RPC function for efficient multi-disease region queries
create or replace function get_disease_trends_regions(
  disease_names text[],
  start_date date default null,
  end_date date default null
)
returns table (
  disease text,
  region text,
  region_code text,
  popularity_score int,
  date date
)
language sql
stable
security definer
as $$
  select 
    gtr.disease,
    gtr.region,
    gtr.region_code,
    gtr.popularity_score,
    gtr.date
  from public.google_trends_regions gtr
  where gtr.disease = any(disease_names)
    and (start_date is null or gtr.date >= start_date)
    and (end_date is null or gtr.date <= end_date)
  order by gtr.disease, gtr.popularity_score desc, gtr.region asc;
$$;

-- 7. Create function to get latest region data per disease (for map visualization)
-- This returns the most recent popularity score for each disease-region combination
create or replace function get_latest_disease_trends_regions(
  disease_names text[],
  days_back int default 90
)
returns table (
  disease text,
  region text,
  region_code text,
  popularity_score int,
  date date
)
language sql
stable
security definer
as $$
  with latest_data as (
    select 
      gtr.disease,
      gtr.region,
      gtr.region_code,
      gtr.popularity_score,
      gtr.date,
      row_number() over (
        partition by gtr.disease, gtr.region 
        order by gtr.date desc
      ) as rn
    from public.google_trends_regions gtr
    where gtr.disease = any(disease_names)
      and gtr.date >= current_date - (days_back || ' days')::interval
      and gtr.popularity_score > 0 -- Exclude regions with insufficient data
  )
  select 
    disease,
    region,
    region_code,
    popularity_score,
    date
  from latest_data
  where rn = 1
  order by disease, popularity_score desc, region asc;
$$;

-- 8. Add comments for the functions
comment on function get_disease_trends_regions(text[], date, date) is 'Retrieves Google Trends region popularity data for multiple diseases within a date range. Used by Disease Tracking component for region map visualization.';
comment on function get_latest_disease_trends_regions(text[], int) is 'Retrieves the most recent region popularity data for multiple diseases (within specified days). Returns one record per disease-region combination. Used for map visualization.';

-- 9. Grant execute permission to anonymous and authenticated users
grant execute on function get_disease_trends_regions(text[], date, date) to anon;
grant execute on function get_disease_trends_regions(text[], date, date) to authenticated;
grant execute on function get_latest_disease_trends_regions(text[], int) to anon;
grant execute on function get_latest_disease_trends_regions(text[], int) to authenticated;

