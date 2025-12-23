-- Migration: Add text fields for spreadsheet format display
-- This adds descriptive text fields to match the exact spreadsheet format

-- Add text fields for descriptive formats (keeping numeric fields for calculations)
ALTER TABLE health_statistics 
  ADD COLUMN IF NOT EXISTS prevalence_text TEXT,
  ADD COLUMN IF NOT EXISTS incidence_text TEXT,
  ADD COLUMN IF NOT EXISTS mortality_rate_text TEXT,
  ADD COLUMN IF NOT EXISTS female_text TEXT,
  ADD COLUMN IF NOT EXISTS male_text TEXT,
  ADD COLUMN IF NOT EXISTS all_sexes_text TEXT,
  ADD COLUMN IF NOT EXISTS location_name TEXT; -- Full country name (e.g., "United States", "USA")

-- Add comments
COMMENT ON COLUMN health_statistics.prevalence_text IS 'Descriptive prevalence format: "~9,800 (34.2M total)"';
COMMENT ON COLUMN health_statistics.incidence_text IS 'Descriptive incidence format: "~640 (new Dx)" or "N/A (chronic)"';
COMMENT ON COLUMN health_statistics.mortality_rate_text IS 'Descriptive mortality format: "Not directly applicable (chronic condition). Annual mortality among diagnosed adults: ~20.3 per 1,000."';
COMMENT ON COLUMN health_statistics.female_text IS 'Female value in percentage format: "~49%"';
COMMENT ON COLUMN health_statistics.male_text IS 'Male value in percentage format: "~51%"';
COMMENT ON COLUMN health_statistics.all_sexes_text IS 'All sexes value with total and percentage: "34.2 million (10.5% of pop.)"';
COMMENT ON COLUMN health_statistics.location_name IS 'Full country name for display: "United States", "United Kingdom", etc.';

-- Ensure age_group is never empty for conditions that need it
-- Update existing NULL age_groups to a default if needed (we'll handle this in the collection function)

-- Create index for location_name
CREATE INDEX IF NOT EXISTS idx_health_statistics_location_name ON health_statistics(location_name);










