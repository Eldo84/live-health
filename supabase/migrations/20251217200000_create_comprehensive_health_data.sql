/*
  Comprehensive Health Data Schema for LiveHealth Global Health Index
  Based on Google Sheets data structure with epidemiological metrics
*/

-- Create comprehensive health conditions table
CREATE TABLE IF NOT EXISTS health_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  condition_name text NOT NULL,
  category text NOT NULL,
  age_group_affected text,
  prevalence_per_100k numeric,
  incidence_per_100k numeric,
  mortality_rate_percent numeric,
  female_rate numeric,
  male_rate numeric,
  all_sexes_rate numeric,
  ylds_per_100k numeric,
  dalys_per_100k numeric,
  year integer,
  country text DEFAULT 'Global',
  data_source text,
  risk_factors text[], -- Array of risk factors
  equity_score numeric, -- AI-generated equity score (0-100)
  intervention_score numeric, -- AI-generated intervention readiness (0-100)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Unique constraint to prevent duplicates
  UNIQUE(condition_name, category, country, year, age_group_affected)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_health_conditions_category ON health_conditions(category);
CREATE INDEX IF NOT EXISTS idx_health_conditions_country ON health_conditions(country);
CREATE INDEX IF NOT EXISTS idx_health_conditions_year ON health_conditions(year);
CREATE INDEX IF NOT EXISTS idx_health_conditions_condition_name ON health_conditions(condition_name);
CREATE INDEX IF NOT EXISTS idx_health_conditions_prevalence ON health_conditions(prevalence_per_100k);
CREATE INDEX IF NOT EXISTS idx_health_conditions_dalys ON health_conditions(dalys_per_100k);

-- Create aggregated data table for dashboard performance
CREATE TABLE IF NOT EXISTS health_aggregates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  country text NOT NULL,
  year integer NOT NULL,
  total_conditions integer DEFAULT 0,
  avg_prevalence numeric DEFAULT 0,
  avg_incidence numeric DEFAULT 0,
  avg_mortality numeric DEFAULT 0,
  total_dalys numeric DEFAULT 0,
  total_ylds numeric DEFAULT 0,
  top_conditions jsonb, -- Store top 5 conditions with their metrics
  risk_factor_summary jsonb, -- Aggregated risk factor data
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(category, country, year)
);

-- Create data sync tracking table
CREATE TABLE IF NOT EXISTS data_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type text NOT NULL, -- 'full', 'incremental', 'manual'
  spreadsheet_url text,
  records_processed integer DEFAULT 0,
  records_updated integer DEFAULT 0,
  records_failed integer DEFAULT 0,
  error_message text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  status text DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed'))
);

-- Enable Row Level Security
ALTER TABLE health_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sync_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
CREATE POLICY "Authenticated users can view health conditions"
  ON health_conditions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view health aggregates"
  ON health_aggregates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view sync logs"
  ON data_sync_log FOR SELECT
  TO authenticated
  USING (true);

-- Create function to update aggregates when conditions change
CREATE OR REPLACE FUNCTION update_health_aggregates()
RETURNS trigger AS $$
BEGIN
  -- Insert or update aggregate data
  INSERT INTO health_aggregates (
    category, country, year,
    total_conditions, avg_prevalence, avg_incidence, avg_mortality,
    total_dalys, total_ylds, updated_at
  )
  SELECT
    category, country, year,
    COUNT(*) as total_conditions,
    AVG(prevalence_per_100k) as avg_prevalence,
    AVG(incidence_per_100k) as avg_incidence,
    AVG(mortality_rate_percent) as avg_mortality,
    SUM(dalys_per_100k) as total_dalys,
    SUM(ylds_per_100k) as total_ylds,
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
    updated_at = EXCLUDED.updated_at;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers to maintain aggregates
CREATE TRIGGER trigger_update_health_aggregates
  AFTER INSERT OR UPDATE OR DELETE ON health_conditions
  FOR EACH ROW EXECUTE FUNCTION update_health_aggregates();

-- Create function to get top conditions for aggregates
CREATE OR REPLACE FUNCTION update_top_conditions_agg()
RETURNS void AS $$
BEGIN
  UPDATE health_aggregates
  SET top_conditions = (
    SELECT jsonb_agg(
      jsonb_build_object(
        'condition_name', condition_name,
        'prevalence', prevalence_per_100k,
        'incidence', incidence_per_100k,
        'mortality', mortality_rate_percent,
        'dalys', dalys_per_100k
      )
    )
    FROM (
      SELECT condition_name, prevalence_per_100k, incidence_per_100k,
             mortality_rate_percent, dalys_per_100k
      FROM health_conditions
      WHERE category = health_aggregates.category
        AND country = health_aggregates.country
        AND year = health_aggregates.year
      ORDER BY dalys_per_100k DESC
      LIMIT 5
    ) top_conditions
  );
END;
$$ LANGUAGE plpgsql;

-- Create function to get risk factor summary
CREATE OR REPLACE FUNCTION update_risk_factor_summary()
RETURNS void AS $$
BEGIN
  UPDATE health_aggregates
  SET risk_factor_summary = (
    SELECT jsonb_object_agg(risk_factor, count)
    FROM (
      SELECT unnest(risk_factors) as risk_factor, COUNT(*) as count
      FROM health_conditions
      WHERE category = health_aggregates.category
        AND country = health_aggregates.country
        AND year = health_aggregates.year
        AND risk_factors IS NOT NULL
      GROUP BY unnest(risk_factors)
      ORDER BY count DESC
      LIMIT 10
    ) risk_summary
  );
END;
$$ LANGUAGE plpgsql;

-- Insert sample data to test the schema (will be replaced by spreadsheet import)
INSERT INTO health_conditions (
  condition_name, category, age_group_affected,
  prevalence_per_100k, incidence_per_100k, mortality_rate_percent,
  female_rate, male_rate, all_sexes_rate,
  ylds_per_100k, dalys_per_100k, year, country, data_source
) VALUES
  ('Diabetes (Type 2)', 'Cardiovascular and Metabolic Disorders', '18–35, 36–60, 60+',
   10500, 670, null, 10200, 11000, 10500, 464.1, 1357.6, 2020, 'Global', 'CDC, ADA, GBD 2019'),
  ('Hypertension', 'Cardiovascular and Metabolic Disorders', '18–35, 36–60, 60+',
   47300, null, null, 43500, 51000, 47300, 119.3, 952.9, 2020, 'Global', 'CDC, AHA, GBD 2019')
ON CONFLICT (condition_name, category, country, year, age_group_affected) DO NOTHING;

































