/*
  # Health Monitoring System Database Schema

  ## Overview
  This migration creates the complete database schema for the Live Health global outbreak and disease monitoring system.

  ## New Tables

  ### 1. `diseases`
  Stores information about different disease types
  - `id` (uuid, primary key) - Unique identifier
  - `name` (text) - Disease name (e.g., "Ebola", "Malaria")
  - `description` (text) - Detailed description
  - `severity_level` (text) - Severity: "critical", "high", "medium", "low"
  - `color_code` (text) - Color for visualization (hex code)
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record update timestamp

  ### 2. `countries`
  Stores country information for geographical tracking
  - `id` (uuid, primary key) - Unique identifier
  - `name` (text) - Country name
  - `code` (text) - ISO country code
  - `continent` (text) - Continent name
  - `population` (bigint) - Current population
  - `created_at` (timestamptz) - Record creation timestamp

  ### 3. `outbreaks`
  Tracks active disease outbreaks
  - `id` (uuid, primary key) - Unique identifier
  - `disease_id` (uuid) - Reference to diseases table
  - `country_id` (uuid) - Reference to countries table
  - `location_details` (text) - Specific location within country
  - `total_cases` (integer) - Total number of cases
  - `new_cases` (integer) - New cases in current period
  - `deaths` (integer) - Total deaths
  - `recovered` (integer) - Total recovered
  - `active_cases` (integer) - Currently active cases
  - `status` (text) - Status: "active", "contained", "resolved"
  - `reported_date` (timestamptz) - Date outbreak was reported
  - `last_updated` (timestamptz) - Last update timestamp
  - `created_at` (timestamptz) - Record creation timestamp

  ### 4. `case_history`
  Historical data for tracking trends over time
  - `id` (uuid, primary key) - Unique identifier
  - `outbreak_id` (uuid) - Reference to outbreaks table
  - `date` (date) - Date of record
  - `cases` (integer) - Number of cases on this date
  - `deaths` (integer) - Number of deaths on this date
  - `recovered` (integer) - Number recovered on this date
  - `created_at` (timestamptz) - Record creation timestamp

  ### 5. `alerts`
  System alerts and notifications
  - `id` (uuid, primary key) - Unique identifier
  - `outbreak_id` (uuid) - Reference to outbreaks table
  - `type` (text) - Alert type: "critical", "warning", "info"
  - `title` (text) - Alert title
  - `description` (text) - Alert description
  - `is_read` (boolean) - Read status
  - `created_at` (timestamptz) - Alert creation timestamp

  ## Security
  - RLS enabled on all tables
  - Public read access for authenticated users
  - Admin-only write access (future implementation)

  ## Indexes
  - Indexed foreign keys for performance
  - Indexed date fields for time-series queries
  - Indexed status fields for filtering
*/

-- Create diseases table
CREATE TABLE IF NOT EXISTS diseases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  severity_level text NOT NULL CHECK (severity_level IN ('critical', 'high', 'medium', 'low')),
  color_code text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create countries table
CREATE TABLE IF NOT EXISTS countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  code text UNIQUE NOT NULL,
  continent text NOT NULL,
  population bigint DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create outbreaks table
CREATE TABLE IF NOT EXISTS outbreaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disease_id uuid NOT NULL REFERENCES diseases(id) ON DELETE CASCADE,
  country_id uuid NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  location_details text,
  total_cases integer DEFAULT 0,
  new_cases integer DEFAULT 0,
  deaths integer DEFAULT 0,
  recovered integer DEFAULT 0,
  active_cases integer DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'contained', 'resolved')),
  reported_date timestamptz DEFAULT now(),
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create case_history table
CREATE TABLE IF NOT EXISTS case_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outbreak_id uuid NOT NULL REFERENCES outbreaks(id) ON DELETE CASCADE,
  date date NOT NULL,
  cases integer DEFAULT 0,
  deaths integer DEFAULT 0,
  recovered integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(outbreak_id, date)
);

-- Create alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outbreak_id uuid NOT NULL REFERENCES outbreaks(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('critical', 'warning', 'info')),
  title text NOT NULL,
  description text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_outbreaks_disease_id ON outbreaks(disease_id);
CREATE INDEX IF NOT EXISTS idx_outbreaks_country_id ON outbreaks(country_id);
CREATE INDEX IF NOT EXISTS idx_outbreaks_status ON outbreaks(status);
CREATE INDEX IF NOT EXISTS idx_outbreaks_reported_date ON outbreaks(reported_date);
CREATE INDEX IF NOT EXISTS idx_case_history_outbreak_id ON case_history(outbreak_id);
CREATE INDEX IF NOT EXISTS idx_case_history_date ON case_history(date);
CREATE INDEX IF NOT EXISTS idx_alerts_outbreak_id ON alerts(outbreak_id);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_is_read ON alerts(is_read);

-- Enable Row Level Security
ALTER TABLE diseases ENABLE ROW LEVEL SECURITY;
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbreaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public read access
CREATE POLICY "Public can view diseases"
  ON diseases FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Public can view countries"
  ON countries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Public can view outbreaks"
  ON outbreaks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Public can view case history"
  ON case_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Public can view alerts"
  ON alerts FOR SELECT
  TO authenticated
  USING (true);

-- Insert sample diseases
INSERT INTO diseases (name, description, severity_level, color_code) VALUES
  ('Ebola', 'Ebola virus disease (EVD) is a rare and deadly disease most commonly affecting people and nonhuman primates', 'critical', '#f87171'),
  ('Malaria', 'Malaria is a life-threatening disease spread to humans by some types of mosquitoes', 'high', '#fbbf24'),
  ('COVID-19', 'Coronavirus disease (COVID-19) is an infectious disease caused by the SARS-CoV-2 virus', 'medium', '#66dbe1'),
  ('Cholera', 'Cholera is an acute diarrheal infection caused by ingestion of food or water contaminated with the bacterium Vibrio cholerae', 'high', '#a78bfa'),
  ('Dengue', 'Dengue is a mosquito-borne viral infection causing flu-like illness', 'medium', '#fb923c'),
  ('Measles', 'Measles is a highly contagious viral disease that can be prevented by vaccination', 'low', '#60a5fa')
ON CONFLICT (name) DO NOTHING;

-- Insert sample countries
INSERT INTO countries (name, code, continent, population) VALUES
  ('Democratic Republic of Congo', 'CD', 'Africa', 95894000),
  ('Nigeria', 'NG', 'Africa', 218541000),
  ('Brazil', 'BR', 'Americas', 215313000),
  ('Yemen', 'YE', 'Asia', 30491000),
  ('Singapore', 'SG', 'Asia', 5454000),
  ('India', 'IN', 'Asia', 1428600000),
  ('United States', 'US', 'Americas', 331900000),
  ('Kenya', 'KE', 'Africa', 54027000)
ON CONFLICT (code) DO NOTHING;
