/*
  Automated Health Data Collection System Schema
  
  This migration creates the schema for automated health data collection:
  - conditions_master: Master schema defining what to collect (from spreadsheet)
  - health_statistics: Numeric health data from APIs/AI
  - ai_health_enrichment: AI-generated qualitative content (separate from numeric data)
  - collection_log: Tracks collection progress by year
*/

-- ============================================================================
-- TABLE: conditions_master
-- Stores the spreadsheet structure - defines what to collect
-- ============================================================================
CREATE TABLE IF NOT EXISTS conditions_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,              -- e.g., "Cardiovascular and Metabolic Disorders"
  condition TEXT NOT NULL,             -- e.g., "Diabetes (Type 2)"
  age_group TEXT,                       -- e.g., "18–35, 36–60, 60+"
  needs_prevalence BOOLEAN DEFAULT true,
  needs_incidence BOOLEAN DEFAULT true,
  needs_mortality BOOLEAN DEFAULT true,
  needs_sex_split BOOLEAN DEFAULT true,
  needs_ylds BOOLEAN DEFAULT false,
  needs_dalys BOOLEAN DEFAULT false,
  risk_factors_template TEXT,           -- Pre-filled from spreadsheet
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(category, condition, age_group)
);

-- Indexes for conditions_master
CREATE INDEX IF NOT EXISTS idx_conditions_master_category ON conditions_master(category);
CREATE INDEX IF NOT EXISTS idx_conditions_master_condition ON conditions_master(condition);

-- ============================================================================
-- TABLE: health_statistics
-- Stores numeric data matching spreadsheet columns
-- ============================================================================
CREATE TABLE IF NOT EXISTS health_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL,
  year INT NOT NULL,
  category TEXT NOT NULL,
  condition TEXT NOT NULL,
  age_group TEXT,
  
  -- Numeric fields (from APIs/AI)
  prevalence_per_100k DECIMAL(10,2),
  incidence_per_100k DECIMAL(10,2),
  mortality_rate DECIMAL(10,2),
  female_value DECIMAL(10,2),
  male_value DECIMAL(10,2),
  all_sexes_value DECIMAL(10,2),
  ylds_per_100k DECIMAL(10,2),
  dalys_per_100k DECIMAL(10,2),
  
  -- Metadata
  data_source TEXT,                    -- e.g., "IHME GBD 2023", "WHO", "CDC", "AI Fallback"
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(country_code, year, condition, age_group)
);

-- Indexes for health_statistics
CREATE INDEX IF NOT EXISTS idx_health_statistics_country_year ON health_statistics(country_code, year);
CREATE INDEX IF NOT EXISTS idx_health_statistics_condition ON health_statistics(condition);
CREATE INDEX IF NOT EXISTS idx_health_statistics_category ON health_statistics(category);
CREATE INDEX IF NOT EXISTS idx_health_statistics_data_source ON health_statistics(data_source);

-- ============================================================================
-- TABLE: ai_health_enrichment
-- Separate table for AI-generated qualitative content
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_health_enrichment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL,
  year INT NOT NULL,
  condition TEXT NOT NULL,
  age_group TEXT,
  
  -- AI-generated fields (never numeric)
  risk_factors TEXT,                   -- Qualitative risk factor descriptions
  equity_notes TEXT,                   -- Equity/disparity considerations
  interventions TEXT,                  -- Evidence-based interventions
  
  -- AI metadata
  model_used TEXT,                     -- e.g., "deepseek-chat", "gpt-4"
  prompt_version TEXT,                 -- Version of prompt template
  generated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(country_code, year, condition, age_group)
);

-- Indexes for ai_health_enrichment
CREATE INDEX IF NOT EXISTS idx_ai_health_enrichment_country_year ON ai_health_enrichment(country_code, year);
CREATE INDEX IF NOT EXISTS idx_ai_health_enrichment_condition ON ai_health_enrichment(condition);

-- ============================================================================
-- TABLE: collection_log
-- Tracks what's been collected
-- ============================================================================
CREATE TABLE IF NOT EXISTS collection_log (
  year INT PRIMARY KEY,
  collected BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  records_collected INT DEFAULT 0,
  records_failed INT DEFAULT 0,
  countries_processed TEXT[],           -- Array of country codes
  error_message TEXT
);

-- Index for collection_log
CREATE INDEX IF NOT EXISTS idx_collection_log_collected ON collection_log(collected);
CREATE INDEX IF NOT EXISTS idx_collection_log_year ON collection_log(year);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE conditions_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_health_enrichment ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conditions_master
CREATE POLICY "Public can view conditions_master"
  ON conditions_master FOR SELECT
  TO public
  USING (true);

-- RLS Policies for health_statistics
CREATE POLICY "Public can view health_statistics"
  ON health_statistics FOR SELECT
  TO public
  USING (true);

-- RLS Policies for ai_health_enrichment
CREATE POLICY "Public can view ai_health_enrichment"
  ON ai_health_enrichment FOR SELECT
  TO public
  USING (true);

-- RLS Policies for collection_log
CREATE POLICY "Public can view collection_log"
  ON collection_log FOR SELECT
  TO public
  USING (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp for health_statistics
CREATE OR REPLACE FUNCTION update_health_statistics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_health_statistics_updated_at
  BEFORE UPDATE ON health_statistics
  FOR EACH ROW
  EXECUTE FUNCTION update_health_statistics_updated_at();

-- Function to validate data consistency
CREATE OR REPLACE FUNCTION validate_health_statistics()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate that DALYs >= YLDs if both are present
  IF NEW.dalys_per_100k IS NOT NULL AND NEW.ylds_per_100k IS NOT NULL THEN
    IF NEW.dalys_per_100k < NEW.ylds_per_100k THEN
      RAISE EXCEPTION 'DALYs per 100k (%) must be >= YLDs per 100k (%)';
    END IF;
  END IF;
  
  -- Validate that mortality_rate is reasonable (not exceeding prevalence)
  IF NEW.mortality_rate IS NOT NULL AND NEW.prevalence_per_100k IS NOT NULL THEN
    IF NEW.mortality_rate > NEW.prevalence_per_100k THEN
      RAISE WARNING 'Mortality rate (%) exceeds prevalence per 100k - data may be inconsistent';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate data on insert/update
CREATE TRIGGER validate_health_statistics_trigger
  BEFORE INSERT OR UPDATE ON health_statistics
  FOR EACH ROW
  EXECUTE FUNCTION validate_health_statistics();

-- Comments for documentation
COMMENT ON TABLE conditions_master IS 'Master schema table defining what health conditions and metrics to collect. Populated from Google Spreadsheet.';
COMMENT ON TABLE health_statistics IS 'Numeric health data collected from APIs (IHME GBD, WHO, CDC) with AI fallback. Separated from qualitative AI content.';
COMMENT ON TABLE ai_health_enrichment IS 'AI-generated qualitative content (risk factors, equity notes, interventions). Never contains numeric data.';
COMMENT ON TABLE collection_log IS 'Tracks collection progress by year. Used for automation and monitoring.';







































