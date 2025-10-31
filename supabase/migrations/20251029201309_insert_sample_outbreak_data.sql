/*
  # Insert Sample Outbreak Data

  ## Overview
  This migration populates the database with realistic sample data for testing and demonstration.

  ## Changes
  1. Insert active outbreak records
  2. Insert historical case data
  3. Insert recent alerts

  ## Notes
  - Uses existing disease and country IDs
  - Creates realistic outbreak scenarios
  - Generates time-series data for charts
*/

-- Insert sample outbreaks
INSERT INTO outbreaks (disease_id, country_id, location_details, total_cases, new_cases, deaths, recovered, active_cases, status, reported_date, last_updated)
SELECT 
  d.id,
  c.id,
  v.location_details,
  v.total_cases,
  v.new_cases,
  v.deaths,
  v.recovered,
  v.active_cases,
  v.status,
  v.reported_date,
  v.last_updated
FROM (VALUES
  ('Ebola', 'Democratic Republic of Congo', 'Kinshasa and surrounding areas', 15420, 452, 8234, 5186, 2000, 'active', now() - interval '30 days', now() - interval '2 hours'),
  ('Malaria', 'Nigeria', 'Lagos region', 12350, 387, 3456, 7894, 1000, 'active', now() - interval '45 days', now() - interval '5 hours'),
  ('COVID-19', 'Brazil', 'São Paulo', 8970, 124, 2456, 6390, 124, 'contained', now() - interval '60 days', now() - interval '8 hours'),
  ('Cholera', 'Yemen', 'Sana''a province', 6540, 234, 987, 4553, 1000, 'active', now() - interval '25 days', now() - interval '12 hours'),
  ('Dengue', 'Singapore', 'Central region', 4230, 189, 45, 3985, 200, 'active', now() - interval '15 days', now() - interval '1 day'),
  ('Malaria', 'Kenya', 'Coastal region', 3890, 156, 678, 3012, 200, 'contained', now() - interval '50 days', now() - interval '2 days'),
  ('COVID-19', 'India', 'Mumbai', 7650, 98, 1234, 6318, 98, 'contained', now() - interval '55 days', now() - interval '3 days'),
  ('Ebola', 'Nigeria', 'Abuja', 2340, 67, 1123, 1150, 67, 'active', now() - interval '20 days', now() - interval '6 hours')
) AS v(disease_name, country_name, location_details, total_cases, new_cases, deaths, recovered, active_cases, status, reported_date, last_updated)
JOIN diseases d ON d.name = v.disease_name
JOIN countries c ON c.name = v.country_name;

-- Insert historical case data for charting (last 7 months)
WITH outbreak_data AS (
  SELECT o.id as outbreak_id, d.name as disease_name
  FROM outbreaks o
  JOIN diseases d ON d.id = o.disease_id
),
date_series AS (
  SELECT generate_series(
    date_trunc('month', now() - interval '6 months'),
    date_trunc('month', now()),
    interval '1 month'
  )::date as record_date
)
INSERT INTO case_history (outbreak_id, date, cases, deaths, recovered)
SELECT 
  od.outbreak_id,
  ds.record_date,
  CASE od.disease_name
    WHEN 'Ebola' THEN 120 + (extract(month from ds.record_date)::int * 25)
    WHEN 'Malaria' THEN 450 + (extract(month from ds.record_date)::int * 15)
    WHEN 'COVID-19' THEN 890 - (extract(month from ds.record_date)::int * 60)
    WHEN 'Cholera' THEN 230 + (extract(month from ds.record_date)::int * 20)
    WHEN 'Dengue' THEN 180 + (extract(month from ds.record_date)::int * 18)
    ELSE 100
  END as cases,
  CASE od.disease_name
    WHEN 'Ebola' THEN 64 + (extract(month from ds.record_date)::int * 12)
    WHEN 'Malaria' THEN 135 + (extract(month from ds.record_date)::int * 8)
    WHEN 'COVID-19' THEN 267 - (extract(month from ds.record_date)::int * 20)
    WHEN 'Cholera' THEN 46 + (extract(month from ds.record_date)::int * 7)
    WHEN 'Dengue' THEN 18 + (extract(month from ds.record_date)::int * 2)
    ELSE 20
  END as deaths,
  CASE od.disease_name
    WHEN 'Ebola' THEN 40 + (extract(month from ds.record_date)::int * 10)
    WHEN 'Malaria' THEN 280 + (extract(month from ds.record_date)::int * 12)
    WHEN 'COVID-19' THEN 560 - (extract(month from ds.record_date)::int * 35)
    WHEN 'Cholera' THEN 165 + (extract(month from ds.record_date)::int * 15)
    WHEN 'Dengue' THEN 150 + (extract(month from ds.record_date)::int * 15)
    ELSE 70
  END as recovered
FROM outbreak_data od
CROSS JOIN date_series ds
ON CONFLICT (outbreak_id, date) DO NOTHING;

-- Insert sample alerts
INSERT INTO alerts (outbreak_id, type, title, description, is_read, created_at)
SELECT 
  o.id,
  v.alert_type,
  v.title,
  v.alert_description,
  v.is_read,
  v.created_at
FROM (VALUES
  ('Ebola', 'Democratic Republic of Congo', 'critical', 'New Ebola Outbreak Detected', 'New outbreak detected in urban area with 45 confirmed cases', false, now() - interval '2 hours'),
  ('Malaria', 'Nigeria', 'warning', 'Malaria Cases Rising', 'Significant increase in cases reported in Lagos region', false, now() - interval '5 hours'),
  ('COVID-19', 'Brazil', 'info', 'New COVID-19 Variant', 'New variant detected, monitoring situation closely', false, now() - interval '8 hours'),
  ('Cholera', 'Yemen', 'warning', 'Cholera Outbreak Spreading', 'Water contamination leading to rapid spread', false, now() - interval '12 hours'),
  ('Dengue', 'Singapore', 'info', 'Seasonal Dengue Outbreak', 'Seasonal outbreak in progress, preventive measures active', false, now() - interval '1 day')
) AS v(disease_name, country_name, alert_type, title, alert_description, is_read, created_at)
JOIN outbreaks o ON o.location_details LIKE '%' || v.country_name || '%'
JOIN diseases d ON d.id = o.disease_id AND d.name = v.disease_name;
