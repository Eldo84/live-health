/*
  # Health Ministries Contact Information

  This migration creates a table to store health ministry/department contact information
  for countries, which can be displayed when viewing outbreaks by country.

  ## Table: health_ministries
  - Stores contact information for health ministries/departments by country
  - Links to countries table for easy lookup
*/

-- Create health_ministries table
CREATE TABLE IF NOT EXISTS health_ministries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id uuid REFERENCES countries(id) ON DELETE CASCADE,
  country_name text NOT NULL, -- Store country name directly for easier lookup
  ministry_name text NOT NULL, -- Health Ministry/Department name
  phone_number text,
  email_address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(country_name) -- One ministry per country
);

-- Create index for faster lookups by country name
CREATE INDEX IF NOT EXISTS idx_health_ministries_country_name ON health_ministries(country_name);
CREATE INDEX IF NOT EXISTS idx_health_ministries_country_id ON health_ministries(country_id);

-- Enable RLS
ALTER TABLE health_ministries ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
CREATE POLICY "Allow public read access to health_ministries"
  ON health_ministries
  FOR SELECT
  USING (true);













































