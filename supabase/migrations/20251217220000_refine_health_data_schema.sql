/*
  Refined Health Data Schema with Research-Grade Methodological Improvements
  - Mortality consistency (per 100k primary)
  - Age-standardization clarity
  - Confidence intervals
  - Projection flags
  - Enhanced validation
*/

-- Add new columns to existing health_conditions table
ALTER TABLE health_conditions
  -- Age-standardization flag
  ADD COLUMN IF NOT EXISTS is_age_standardized boolean DEFAULT false,
  
  -- Confidence intervals for primary metrics
  ADD COLUMN IF NOT EXISTS prevalence_lower_ci numeric,
  ADD COLUMN IF NOT EXISTS prevalence_upper_ci numeric,
  ADD COLUMN IF NOT EXISTS incidence_lower_ci numeric,
  ADD COLUMN IF NOT EXISTS incidence_upper_ci numeric,
  ADD COLUMN IF NOT EXISTS mortality_lower_ci numeric,
  ADD COLUMN IF NOT EXISTS mortality_upper_ci numeric,
  ADD COLUMN IF NOT EXISTS ylds_lower_ci numeric,
  ADD COLUMN IF NOT EXISTS ylds_upper_ci numeric,
  ADD COLUMN IF NOT EXISTS dalys_lower_ci numeric,
  ADD COLUMN IF NOT EXISTS dalys_upper_ci numeric,
  
  -- Mortality consistency: Rename mortality_rate_percent to mortality_per_100k
  -- First add new column, then migrate data, then drop old
  ADD COLUMN IF NOT EXISTS mortality_per_100k numeric,
  ADD COLUMN IF NOT EXISTS case_fatality_rate_percent numeric,
  
  -- Governance fields
  ADD COLUMN IF NOT EXISTS is_projection boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS projection_method text,
  ADD COLUMN IF NOT EXISTS data_generation_method text DEFAULT 'AI-modeled epidemiological estimate',
  
  -- Regional context
  ADD COLUMN IF NOT EXISTS who_region text,
  ADD COLUMN IF NOT EXISTS world_bank_income_group text;

-- Migrate existing mortality_rate_percent to mortality_per_100k
-- Assuming mortality_rate_percent was stored as percentage, convert to per 100k
UPDATE health_conditions
SET mortality_per_100k = CASE 
  WHEN mortality_rate_percent IS NOT NULL THEN mortality_rate_percent * 10
  ELSE NULL
END
WHERE mortality_per_100k IS NULL AND mortality_rate_percent IS NOT NULL;

-- Add validation constraints
ALTER TABLE health_conditions
  -- Sex consistency check (tolerance 8%)
  ADD CONSTRAINT valid_sex_consistency CHECK (
    abs((COALESCE(female_rate, 0) + COALESCE(male_rate, 0)) / 2 - COALESCE(all_sexes_rate, 0)) <= 8
  ),
  
  -- DALYs must be >= YLDs
  ADD CONSTRAINT valid_dalys CHECK (
    dalys_per_100k IS NULL OR ylds_per_100k IS NULL OR dalys_per_100k >= ylds_per_100k
  ),
  
  -- Incidence should be reasonable (not more than 2x prevalence)
  ADD CONSTRAINT valid_incidence CHECK (
    incidence_per_100k IS NULL OR prevalence_per_100k IS NULL OR incidence_per_100k <= prevalence_per_100k * 2
  ),
  
  -- Mortality cannot exceed prevalence
  ADD CONSTRAINT valid_mortality CHECK (
    mortality_per_100k IS NULL OR prevalence_per_100k IS NULL OR mortality_per_100k <= prevalence_per_100k
  ),
  
  -- Score ranges
  ADD CONSTRAINT valid_equity_score CHECK (
    equity_score IS NULL OR (equity_score >= 0 AND equity_score <= 100)
  ),
  ADD CONSTRAINT valid_intervention_score CHECK (
    intervention_score IS NULL OR (intervention_score >= 0 AND intervention_score <= 100)
  ),
  
  -- Confidence interval validation
  ADD CONSTRAINT valid_prevalence_ci CHECK (
    prevalence_lower_ci IS NULL OR prevalence_upper_ci IS NULL OR prevalence_per_100k IS NULL OR
    (prevalence_lower_ci < prevalence_per_100k AND prevalence_upper_ci > prevalence_per_100k)
  ),
  ADD CONSTRAINT valid_dalys_ci CHECK (
    dalys_lower_ci IS NULL OR dalys_upper_ci IS NULL OR dalys_per_100k IS NULL OR
    (dalys_lower_ci < dalys_per_100k AND dalys_upper_ci > dalys_per_100k)
  );

-- Update health_aggregates table with derived metrics
ALTER TABLE health_aggregates
  ADD COLUMN IF NOT EXISTS total_deaths numeric,
  ADD COLUMN IF NOT EXISTS mean_equity_score numeric,
  ADD COLUMN IF NOT EXISTS mean_intervention_score numeric;

-- Update aggregate function to include new metrics
CREATE OR REPLACE FUNCTION update_health_aggregates()
RETURNS trigger AS $$
BEGIN
  INSERT INTO health_aggregates (
    category, country, year,
    total_conditions, avg_prevalence, avg_incidence, avg_mortality,
    total_dalys, total_ylds, total_deaths,
    mean_equity_score, mean_intervention_score,
    updated_at
  )
  SELECT
    category, country, year,
    COUNT(*) as total_conditions,
    AVG(prevalence_per_100k) as avg_prevalence,
    AVG(incidence_per_100k) as avg_incidence,
    AVG(mortality_per_100k) as avg_mortality,
    SUM(dalys_per_100k) as total_dalys,
    SUM(ylds_per_100k) as total_ylds,
    SUM(mortality_per_100k) as total_deaths,
    AVG(equity_score) as mean_equity_score,
    AVG(intervention_score) as mean_intervention_score,
    now() as updated_at
  FROM health_conditions
  WHERE category = COALESCE(NEW.category, OLD.category)
    AND country = COALESCE(NEW.country, OLD.country)
    AND year = COALESCE(NEW.year, OLD.year)
  GROUP BY category, country, year
  ON CONFLICT (category, country, year)
  DO UPDATE SET
    total_conditions = EXCLUDED.total_conditions,
    avg_prevalence = EXCLUDED.avg_prevalence,
    avg_incidence = EXCLUDED.avg_incidence,
    avg_mortality = EXCLUDED.avg_mortality,
    total_dalys = EXCLUDED.total_dalys,
    total_ylds = EXCLUDED.total_ylds,
    total_deaths = EXCLUDED.total_deaths,
    mean_equity_score = EXCLUDED.mean_equity_score,
    mean_intervention_score = EXCLUDED.mean_intervention_score,
    updated_at = EXCLUDED.updated_at;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create materialized views for performance
CREATE MATERIALIZED VIEW IF NOT EXISTS country_year_summary AS
SELECT 
  country,
  year,
  COUNT(DISTINCT condition_name) as total_conditions,
  SUM(dalys_per_100k) as total_dalys,
  SUM(mortality_per_100k) as total_deaths_per_100k,
  AVG(equity_score) as avg_equity,
  AVG(intervention_score) as avg_intervention,
  COUNT(*) FILTER (WHERE is_projection = true) as projection_count
FROM health_conditions
GROUP BY country, year;

CREATE INDEX IF NOT EXISTS idx_country_year_summary_country_year 
ON country_year_summary(country, year);

CREATE MATERIALIZED VIEW IF NOT EXISTS condition_year_trends AS
SELECT 
  condition_name,
  category,
  year,
  AVG(prevalence_per_100k) as avg_prevalence,
  AVG(incidence_per_100k) as avg_incidence,
  AVG(mortality_per_100k) as avg_mortality,
  COUNT(DISTINCT country) as country_count
FROM health_conditions
GROUP BY condition_name, category, year;

CREATE INDEX IF NOT EXISTS idx_condition_year_trends_condition_year 
ON condition_year_trends(condition_name, year);

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_health_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY country_year_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY condition_year_trends;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON COLUMN health_conditions.mortality_per_100k IS 'Primary mortality metric: deaths per 100,000 population (age-standardized)';
COMMENT ON COLUMN health_conditions.case_fatality_rate_percent IS 'Derived metric: percentage of cases that result in death';
COMMENT ON COLUMN health_conditions.is_age_standardized IS 'True if rates are age-standardized, false if age-specific';
COMMENT ON COLUMN health_conditions.is_projection IS 'True for 2024 data or other projected estimates';
COMMENT ON COLUMN health_conditions.data_generation_method IS 'Method used to generate data: AI-modeled epidemiological estimate';
COMMENT ON COLUMN health_conditions.prevalence_lower_ci IS '95% confidence interval lower bound for prevalence';
COMMENT ON COLUMN health_conditions.prevalence_upper_ci IS '95% confidence interval upper bound for prevalence';


























