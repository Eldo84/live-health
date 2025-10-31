/*
  # News Collection and AI-Powered Features Schema

  ## Overview
  This migration extends the database to support:
  - News article collection from multiple sources
  - Disease keyword extraction and taxonomy
  - AI-powered predictions
  - Global health metrics
  - Enhanced alert tracking

  ## New Tables

  ### 1. `news_sources`
  Tracks trusted news and health organization sources
  - `id` (uuid, primary key)
  - `name` (text) - Source name (e.g., "Google News", "CDC", "WHO")
  - `url` (text) - Base URL
  - `type` (text) - "news", "government", "international_org"
  - `reliability_score` (decimal) - 0-1 score
  - `is_active` (boolean) - Currently monitoring
  - `created_at` (timestamptz)

  ### 2. `news_articles`
  Stores collected articles mentioning disease outbreaks
  - `id` (uuid, primary key)
  - `source_id` (uuid) - Reference to news_sources
  - `title` (text) - Article title
  - `content` (text) - Full article content
  - `url` (text) - Article URL
  - `published_at` (timestamptz) - Publication date
  - `scraped_at` (timestamptz) - When we collected it
  - `location_extracted` (jsonb) - Extracted location data
  - `diseases_mentioned` (text[]) - Array of disease keywords
  - `sentiment_score` (decimal) - -1 to 1
  - `is_verified` (boolean) - Manually verified
  - `created_at` (timestamptz)

  ### 3. `disease_keywords`
  Disease taxonomy for keyword matching
  - `id` (uuid, primary key)
  - `disease_id` (uuid) - Reference to diseases
  - `keyword` (text) - Keyword or alias
  - `keyword_type` (text) - "primary", "alias", "symptom", "scientific"
  - `confidence_weight` (decimal) - Matching confidence 0-1
  - `created_at` (timestamptz)

  ### 4. `outbreak_signals`
  Links news articles to detected outbreak signals
  - `id` (uuid, primary key)
  - `article_id` (uuid) - Reference to news_articles
  - `disease_id` (uuid) - Reference to diseases
  - `country_id` (uuid) - Reference to countries
  - `latitude` (decimal) - Geo coordinates
  - `longitude` (decimal) - Geo coordinates
  - `confidence_score` (decimal) - Detection confidence 0-1
  - `case_count_mentioned` (integer) - Cases mentioned in article
  - `severity_assessment` (text) - "low", "medium", "high", "critical"
  - `is_new_outbreak` (boolean) - New vs ongoing
  - `detected_at` (timestamptz)
  - `created_at` (timestamptz)

  ### 5. `ai_predictions`
  AI model predictions for outbreak forecasting
  - `id` (uuid, primary key)
  - `disease_id` (uuid) - Reference to diseases
  - `country_id` (uuid) - Reference to countries
  - `prediction_type` (text) - "spread", "risk_level", "case_forecast"
  - `prediction_date` (date) - Date of prediction
  - `target_date` (date) - Date being predicted
  - `predicted_value` (jsonb) - Prediction details
  - `confidence_interval` (jsonb) - Upper/lower bounds
  - `model_name` (text) - AI model used
  - `model_version` (text) - Version number
  - `accuracy_score` (decimal) - Historical accuracy
  - `created_at` (timestamptz)

  ### 6. `health_metrics`
  Global population health indicators
  - `id` (uuid, primary key)
  - `country_id` (uuid) - Reference to countries
  - `year` (integer) - Year of data
  - `dalys` (bigint) - Disability-Adjusted Life Years
  - `mortality_rate` (decimal) - Deaths per 100k
  - `disease_burden_score` (decimal) - 0-100 score
  - `healthcare_access_index` (decimal) - 0-1 score
  - `equity_indicator` (decimal) - 0-1 score
  - `life_expectancy` (decimal) - Years
  - `under5_mortality` (decimal) - Per 1000 births
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 7. `alert_timeline`
  Enhanced alert tracking with timeline data
  - `id` (uuid, primary key)
  - `alert_id` (uuid) - Reference to alerts
  - `event_type` (text) - "detected", "escalated", "contained", "resolved"
  - `event_description` (text) - Event details
  - `affected_population` (integer) - Estimated affected
  - `response_actions` (text[]) - Actions taken
  - `occurred_at` (timestamptz) - When event occurred
  - `created_at` (timestamptz)

  ### 8. `trend_analysis`
  Time-series data for trend visualization (like Google Trends)
  - `id` (uuid, primary key)
  - `disease_id` (uuid) - Reference to diseases
  - `country_id` (uuid) - Reference to countries
  - `date` (date) - Date of measurement
  - `mention_count` (integer) - Times mentioned in news
  - `search_volume` (integer) - Estimated search interest
  - `social_media_volume` (integer) - Social mentions
  - `severity_trend` (decimal) - Trending severity 0-1
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Public read access for authenticated users
  - Admin-only write access

  ## Indexes
  - Geographic queries (lat/lng)
  - Time-series queries (dates)
  - Full-text search on articles
  - Array searches on keywords
*/

-- Create news_sources table
CREATE TABLE IF NOT EXISTS news_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  url text NOT NULL,
  type text NOT NULL CHECK (type IN ('news', 'government', 'international_org', 'research')),
  reliability_score decimal(3,2) DEFAULT 0.80 CHECK (reliability_score >= 0 AND reliability_score <= 1),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create news_articles table
CREATE TABLE IF NOT EXISTS news_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES news_sources(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  url text UNIQUE NOT NULL,
  published_at timestamptz NOT NULL,
  scraped_at timestamptz DEFAULT now(),
  location_extracted jsonb,
  diseases_mentioned text[],
  sentiment_score decimal(3,2) CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create disease_keywords table
CREATE TABLE IF NOT EXISTS disease_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disease_id uuid NOT NULL REFERENCES diseases(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  keyword_type text NOT NULL CHECK (keyword_type IN ('primary', 'alias', 'symptom', 'scientific')),
  confidence_weight decimal(3,2) DEFAULT 1.00 CHECK (confidence_weight >= 0 AND confidence_weight <= 1),
  created_at timestamptz DEFAULT now(),
  UNIQUE(disease_id, keyword)
);

-- Create outbreak_signals table
CREATE TABLE IF NOT EXISTS outbreak_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES news_articles(id) ON DELETE CASCADE,
  disease_id uuid NOT NULL REFERENCES diseases(id) ON DELETE CASCADE,
  country_id uuid REFERENCES countries(id) ON DELETE CASCADE,
  latitude decimal(10,8),
  longitude decimal(11,8),
  confidence_score decimal(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  case_count_mentioned integer DEFAULT 0,
  severity_assessment text NOT NULL CHECK (severity_assessment IN ('low', 'medium', 'high', 'critical')),
  is_new_outbreak boolean DEFAULT true,
  detected_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create ai_predictions table
CREATE TABLE IF NOT EXISTS ai_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disease_id uuid NOT NULL REFERENCES diseases(id) ON DELETE CASCADE,
  country_id uuid REFERENCES countries(id) ON DELETE CASCADE,
  prediction_type text NOT NULL CHECK (prediction_type IN ('spread', 'risk_level', 'case_forecast', 'mortality_forecast')),
  prediction_date date NOT NULL,
  target_date date NOT NULL,
  predicted_value jsonb NOT NULL,
  confidence_interval jsonb,
  model_name text NOT NULL,
  model_version text NOT NULL,
  accuracy_score decimal(3,2) CHECK (accuracy_score >= 0 AND accuracy_score <= 1),
  created_at timestamptz DEFAULT now()
);

-- Create health_metrics table
CREATE TABLE IF NOT EXISTS health_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id uuid NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  year integer NOT NULL,
  dalys bigint DEFAULT 0,
  mortality_rate decimal(10,2) DEFAULT 0,
  disease_burden_score decimal(5,2) DEFAULT 0 CHECK (disease_burden_score >= 0 AND disease_burden_score <= 100),
  healthcare_access_index decimal(3,2) DEFAULT 0.50 CHECK (healthcare_access_index >= 0 AND healthcare_access_index <= 1),
  equity_indicator decimal(3,2) DEFAULT 0.50 CHECK (equity_indicator >= 0 AND equity_indicator <= 1),
  life_expectancy decimal(5,2) DEFAULT 0,
  under5_mortality decimal(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(country_id, year)
);

-- Create alert_timeline table
CREATE TABLE IF NOT EXISTS alert_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('detected', 'escalated', 'contained', 'resolved', 'updated')),
  event_description text NOT NULL,
  affected_population integer DEFAULT 0,
  response_actions text[],
  occurred_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create trend_analysis table
CREATE TABLE IF NOT EXISTS trend_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disease_id uuid NOT NULL REFERENCES diseases(id) ON DELETE CASCADE,
  country_id uuid REFERENCES countries(id) ON DELETE CASCADE,
  date date NOT NULL,
  mention_count integer DEFAULT 0,
  search_volume integer DEFAULT 0,
  social_media_volume integer DEFAULT 0,
  severity_trend decimal(3,2) DEFAULT 0.50 CHECK (severity_trend >= 0 AND severity_trend <= 1),
  created_at timestamptz DEFAULT now(),
  UNIQUE(disease_id, country_id, date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_news_articles_source_id ON news_articles(source_id);
CREATE INDEX IF NOT EXISTS idx_news_articles_published_at ON news_articles(published_at);
CREATE INDEX IF NOT EXISTS idx_news_articles_diseases ON news_articles USING GIN(diseases_mentioned);
CREATE INDEX IF NOT EXISTS idx_disease_keywords_disease_id ON disease_keywords(disease_id);
CREATE INDEX IF NOT EXISTS idx_disease_keywords_keyword ON disease_keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_outbreak_signals_article_id ON outbreak_signals(article_id);
CREATE INDEX IF NOT EXISTS idx_outbreak_signals_disease_id ON outbreak_signals(disease_id);
CREATE INDEX IF NOT EXISTS idx_outbreak_signals_country_id ON outbreak_signals(country_id);
CREATE INDEX IF NOT EXISTS idx_outbreak_signals_location ON outbreak_signals(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_outbreak_signals_detected_at ON outbreak_signals(detected_at);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_disease_id ON ai_predictions(disease_id);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_target_date ON ai_predictions(target_date);
CREATE INDEX IF NOT EXISTS idx_health_metrics_country_id ON health_metrics(country_id);
CREATE INDEX IF NOT EXISTS idx_health_metrics_year ON health_metrics(year);
CREATE INDEX IF NOT EXISTS idx_alert_timeline_alert_id ON alert_timeline(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_timeline_occurred_at ON alert_timeline(occurred_at);
CREATE INDEX IF NOT EXISTS idx_trend_analysis_disease_id ON trend_analysis(disease_id);
CREATE INDEX IF NOT EXISTS idx_trend_analysis_date ON trend_analysis(date);

-- Enable Row Level Security
ALTER TABLE news_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE disease_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbreak_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_analysis ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Public can view news sources"
  ON news_sources FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Public can view news articles"
  ON news_articles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Public can view disease keywords"
  ON disease_keywords FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Public can view outbreak signals"
  ON outbreak_signals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Public can view AI predictions"
  ON ai_predictions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Public can view health metrics"
  ON health_metrics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Public can view alert timeline"
  ON alert_timeline FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Public can view trend analysis"
  ON trend_analysis FOR SELECT
  TO authenticated
  USING (true);
