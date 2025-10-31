/*
  # Add Pathogen and Outbreak Category Support

  ## Overview
  Extends the database schema to support the comprehensive disease spreadsheet data
  including pathogens, outbreak categories, and detailed disease classifications.

  ## New Tables

  ### 1. `pathogens`
  Stores information about disease-causing microorganisms
  - `id` (uuid, primary key)
  - `name` (text) - Pathogen name
  - `type` (text) - Bacteria, Virus, Fungus, Parasite, Helminth, etc.
  - `description` (text) - Details about the pathogen
  - `created_at` (timestamptz)

  ### 2. `outbreak_categories`
  Categorizes outbreaks by transmission method
  - `id` (uuid, primary key)
  - `name` (text) - Category name (e.g., "Foodborne Outbreaks")
  - `description` (text) - Category description
  - `icon` (text) - Icon identifier for UI
  - `color` (text) - Color hex code for visualization
  - `created_at` (timestamptz)

  ### 3. `disease_pathogens`
  Links diseases to their causative pathogens (many-to-many)
  - `id` (uuid, primary key)
  - `disease_id` (uuid) - Reference to diseases
  - `pathogen_id` (uuid) - Reference to pathogens
  - `is_primary` (boolean) - Primary pathogen for this disease
  - `created_at` (timestamptz)

  ### 4. `disease_categories`
  Links diseases to outbreak categories (many-to-many)
  - `id` (uuid, primary key)
  - `disease_id` (uuid) - Reference to diseases
  - `category_id` (uuid) - Reference to outbreak_categories
  - `created_at` (timestamptz)

  ## Changes to Existing Tables

  ### `diseases` table
  - Add `clinical_manifestation` (text) - Detailed clinical description
  - Add `spreadsheet_source` (boolean) - Flag for imported data

  ## Security
  - RLS enabled on all tables
  - Public read access for authenticated users

  ## Indexes
  - All foreign keys indexed
  - Text search on pathogen names and types
*/

-- Add new columns to diseases table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'diseases' AND column_name = 'clinical_manifestation'
  ) THEN
    ALTER TABLE diseases ADD COLUMN clinical_manifestation text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'diseases' AND column_name = 'spreadsheet_source'
  ) THEN
    ALTER TABLE diseases ADD COLUMN spreadsheet_source boolean DEFAULT false;
  END IF;
END $$;

-- Create pathogens table
CREATE TABLE IF NOT EXISTS pathogens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  type text NOT NULL CHECK (type IN ('Bacteria', 'Virus', 'Fungus', 'Parasite', 'Protozoan', 'Helminth', 'Prion', 'Other')),
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create outbreak_categories table
CREATE TABLE IF NOT EXISTS outbreak_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  icon text,
  color text DEFAULT '#66dbe1',
  created_at timestamptz DEFAULT now()
);

-- Create disease_pathogens junction table
CREATE TABLE IF NOT EXISTS disease_pathogens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disease_id uuid NOT NULL REFERENCES diseases(id) ON DELETE CASCADE,
  pathogen_id uuid NOT NULL REFERENCES pathogens(id) ON DELETE CASCADE,
  is_primary boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(disease_id, pathogen_id)
);

-- Create disease_categories junction table
CREATE TABLE IF NOT EXISTS disease_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disease_id uuid NOT NULL REFERENCES diseases(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES outbreak_categories(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(disease_id, category_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pathogens_type ON pathogens(type);
CREATE INDEX IF NOT EXISTS idx_pathogens_name ON pathogens(name);
CREATE INDEX IF NOT EXISTS idx_disease_pathogens_disease_id ON disease_pathogens(disease_id);
CREATE INDEX IF NOT EXISTS idx_disease_pathogens_pathogen_id ON disease_pathogens(pathogen_id);
CREATE INDEX IF NOT EXISTS idx_disease_categories_disease_id ON disease_categories(disease_id);
CREATE INDEX IF NOT EXISTS idx_disease_categories_category_id ON disease_categories(category_id);

-- Enable Row Level Security
ALTER TABLE pathogens ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbreak_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE disease_pathogens ENABLE ROW LEVEL SECURITY;
ALTER TABLE disease_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Public can view pathogens"
  ON pathogens FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Public can view outbreak categories"
  ON outbreak_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Public can view disease pathogens"
  ON disease_pathogens FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Public can view disease categories"
  ON disease_categories FOR SELECT
  TO authenticated
  USING (true);

-- Insert common outbreak categories
INSERT INTO outbreak_categories (name, description, icon, color) VALUES
  ('Foodborne Outbreaks', 'Diseases transmitted through contaminated food', 'utensils', '#f87171'),
  ('Waterborne Outbreaks', 'Diseases transmitted through contaminated water', 'droplet', '#66dbe1'),
  ('Vector-Borne Outbreaks', 'Diseases transmitted by vectors like mosquitoes', 'bug', '#fbbf24'),
  ('Airborne Outbreaks', 'Diseases transmitted through air', 'wind', '#a78bfa'),
  ('Contact Transmission', 'Diseases transmitted through direct contact', 'hand', '#fb923c'),
  ('Healthcare-Associated Infections', 'Infections acquired in healthcare settings', 'hospital', '#ef4444'),
  ('Zoonotic Outbreaks', 'Diseases transmitted from animals to humans', 'paw', '#10b981'),
  ('Sexually Transmitted Infections', 'Diseases transmitted through sexual contact', 'heart', '#ec4899'),
  ('Vaccine-Preventable Diseases', 'Diseases that can be prevented by vaccination', 'shield', '#3b82f6'),
  ('Emerging Infectious Diseases', 'Newly identified diseases or re-emerging threats', 'alert-triangle', '#f59e0b')
ON CONFLICT (name) DO NOTHING;

-- Insert common pathogen types as sample data
INSERT INTO pathogens (name, type, description) VALUES
  ('Plasmodium spp.', 'Protozoan', 'Causative agent of malaria'),
  ('Ebola virus', 'Virus', 'Causative agent of Ebola hemorrhagic fever'),
  ('SARS-CoV-2', 'Virus', 'Causative agent of COVID-19'),
  ('Vibrio cholerae', 'Bacteria', 'Causative agent of cholera'),
  ('Dengue virus', 'Virus', 'Causative agent of dengue fever'),
  ('Measles morbillivirus', 'Virus', 'Causative agent of measles')
ON CONFLICT (name) DO NOTHING;

-- Link existing diseases to pathogens
INSERT INTO disease_pathogens (disease_id, pathogen_id, is_primary)
SELECT d.id, p.id, true
FROM diseases d
JOIN pathogens p ON (
  (d.name = 'Malaria' AND p.name = 'Plasmodium spp.') OR
  (d.name = 'Ebola' AND p.name = 'Ebola virus') OR
  (d.name = 'COVID-19' AND p.name = 'SARS-CoV-2') OR
  (d.name = 'Cholera' AND p.name = 'Vibrio cholerae') OR
  (d.name = 'Dengue' AND p.name = 'Dengue virus') OR
  (d.name = 'Measles' AND p.name = 'Measles morbillivirus')
)
ON CONFLICT (disease_id, pathogen_id) DO NOTHING;

-- Link diseases to categories
INSERT INTO disease_categories (disease_id, category_id)
SELECT d.id, oc.id
FROM diseases d
CROSS JOIN outbreak_categories oc
WHERE
  (d.name = 'Malaria' AND oc.name = 'Vector-Borne Outbreaks') OR
  (d.name = 'Ebola' AND oc.name = 'Emerging Infectious Diseases') OR
  (d.name = 'COVID-19' AND oc.name = 'Airborne Outbreaks') OR
  (d.name = 'Cholera' AND oc.name = 'Waterborne Outbreaks') OR
  (d.name = 'Dengue' AND oc.name = 'Vector-Borne Outbreaks') OR
  (d.name = 'Measles' AND oc.name = 'Vaccine-Preventable Diseases')
ON CONFLICT (disease_id, category_id) DO NOTHING;
