/*
  # Populate News Collection and AI Features Sample Data

  ## Overview
  Populates sample data for news sources, articles, disease keywords, 
  outbreak signals, AI predictions, and health metrics.

  ## Changes
  1. Insert trusted news sources
  2. Insert disease taxonomy keywords
  3. Insert sample news articles
  4. Insert outbreak signals from articles
  5. Insert AI predictions
  6. Insert global health metrics
  7. Insert trend analysis data
*/

-- Insert news sources
INSERT INTO news_sources (name, url, type, reliability_score, is_active) VALUES
  ('Google News Health', 'https://news.google.com/topics/CAAqIQgKIhtDQkFTRGdvSUwyMHZNR3QwTlRFU0FtVnVLQUFQAQ', 'news', 0.85, true),
  ('CDC - Centers for Disease Control', 'https://www.cdc.gov', 'government', 0.98, true),
  ('WHO - World Health Organization', 'https://www.who.int', 'international_org', 0.99, true),
  ('ProMED-mail', 'https://promedmail.org', 'research', 0.95, true),
  ('Reuters Health', 'https://www.reuters.com/business/healthcare-pharmaceuticals/', 'news', 0.90, true),
  ('BBC Health', 'https://www.bbc.com/news/health', 'news', 0.88, true)
ON CONFLICT (name) DO NOTHING;

-- Insert disease keywords for taxonomy matching
INSERT INTO disease_keywords (disease_id, keyword, keyword_type, confidence_weight)
SELECT d.id, v.keyword, v.keyword_type, v.confidence_weight
FROM (VALUES
  ('Ebola', 'ebola', 'primary', 1.00),
  ('Ebola', 'ebola virus disease', 'alias', 1.00),
  ('Ebola', 'EVD', 'alias', 0.95),
  ('Ebola', 'hemorrhagic fever', 'symptom', 0.70),
  ('Ebola', 'filovirus', 'scientific', 0.90),
  
  ('Malaria', 'malaria', 'primary', 1.00),
  ('Malaria', 'plasmodium', 'scientific', 0.95),
  ('Malaria', 'mosquito-borne illness', 'alias', 0.80),
  ('Malaria', 'fever chills', 'symptom', 0.60),
  
  ('COVID-19', 'covid', 'primary', 1.00),
  ('COVID-19', 'covid-19', 'primary', 1.00),
  ('COVID-19', 'coronavirus', 'alias', 0.95),
  ('COVID-19', 'sars-cov-2', 'scientific', 1.00),
  ('COVID-19', 'pandemic', 'alias', 0.70),
  
  ('Cholera', 'cholera', 'primary', 1.00),
  ('Cholera', 'vibrio cholerae', 'scientific', 1.00),
  ('Cholera', 'acute diarrhea', 'symptom', 0.60),
  ('Cholera', 'waterborne disease', 'alias', 0.75),
  
  ('Dengue', 'dengue', 'primary', 1.00),
  ('Dengue', 'dengue fever', 'alias', 1.00),
  ('Dengue', 'breakbone fever', 'alias', 0.85),
  ('Dengue', 'aedes mosquito', 'symptom', 0.70),
  
  ('Measles', 'measles', 'primary', 1.00),
  ('Measles', 'rubeola', 'scientific', 0.95),
  ('Measles', 'red rash', 'symptom', 0.50)
) AS v(disease_name, keyword, keyword_type, confidence_weight)
JOIN diseases d ON d.name = v.disease_name
ON CONFLICT (disease_id, keyword) DO NOTHING;

-- Insert sample news articles
INSERT INTO news_articles (source_id, title, content, url, published_at, location_extracted, diseases_mentioned, sentiment_score, is_verified)
SELECT 
  ns.id,
  v.title,
  v.content,
  v.url,
  v.published_at,
  v.location_extracted::jsonb,
  v.diseases_mentioned::text[],
  v.sentiment_score,
  v.is_verified
FROM (VALUES
  ('CDC - Centers for Disease Control', 
   'Ebola Outbreak Expands in Eastern DRC', 
   'Health officials report 45 new confirmed cases of Ebola virus disease in the Kinshasa region. The outbreak, which began three weeks ago, has now spread to densely populated urban areas raising concerns about rapid transmission.',
   'https://cdc.gov/ebola/outbreak-2024-drc-001',
   now() - interval '2 hours',
   '{"country": "Democratic Republic of Congo", "city": "Kinshasa", "lat": -4.3317, "lng": 15.3139}',
   '{"ebola", "EVD"}',
   -0.65,
   true),
   
  ('WHO - World Health Organization',
   'Malaria Cases Surge in West Africa',
   'The World Health Organization reports a significant increase in malaria cases across Nigeria, with the Lagos region experiencing a 35% rise in infections compared to last month. Climate conditions and mosquito population growth are contributing factors.',
   'https://who.int/news/malaria-nigeria-2024',
   now() - interval '5 hours',
   '{"country": "Nigeria", "region": "Lagos", "lat": 6.5244, "lng": 3.3792}',
   '{"malaria", "mosquito-borne illness"}',
   -0.50,
   true),
   
  ('Reuters Health',
   'Brazil Detects New COVID-19 Variant',
   'Brazilian health authorities have identified a new variant of SARS-CoV-2 in São Paulo. While the variant shows increased transmissibility, current vaccines appear to maintain effectiveness. Officials are monitoring the situation closely.',
   'https://reuters.com/health/covid-brazil-variant-2024',
   now() - interval '8 hours',
   '{"country": "Brazil", "city": "São Paulo", "lat": -23.5505, "lng": -46.6333}',
   '{"covid-19", "coronavirus", "sars-cov-2"}',
   -0.40,
   true),
   
  ('ProMED-mail',
   'Cholera Outbreak Linked to Water Contamination in Yemen',
   'A cholera outbreak in Sanaa province has been traced to contaminated water sources. Over 230 cases have been confirmed in the past week, with rapid spread raising concerns about public health infrastructure.',
   'https://promedmail.org/post/yemen-cholera-2024',
   now() - interval '12 hours',
   '{"country": "Yemen", "region": "Sanaa", "lat": 15.5527, "lng": 48.5164}',
   '{"cholera", "vibrio cholerae", "waterborne disease"}',
   -0.70,
   true),
   
  ('BBC Health',
   'Seasonal Dengue Outbreak Active in Singapore',
   'Singapore health officials report an ongoing seasonal dengue outbreak with 189 new cases this week. Preventive measures including mosquito control operations are underway in central districts.',
   'https://bbc.com/news/health-singapore-dengue-2024',
   now() - interval '1 day',
   '{"country": "Singapore", "region": "Central", "lat": 1.3521, "lng": 103.8198}',
   '{"dengue", "dengue fever", "aedes mosquito"}',
   -0.35,
   true)
) AS v(source_name, title, content, url, published_at, location_extracted, diseases_mentioned, sentiment_score, is_verified)
JOIN news_sources ns ON ns.name = v.source_name;

-- Insert outbreak signals from news articles
INSERT INTO outbreak_signals (article_id, disease_id, country_id, latitude, longitude, confidence_score, case_count_mentioned, severity_assessment, is_new_outbreak)
SELECT 
  na.id,
  d.id,
  c.id,
  (na.location_extracted->>'lat')::decimal,
  (na.location_extracted->>'lng')::decimal,
  v.confidence_score,
  v.case_count,
  v.severity,
  v.is_new
FROM (VALUES
  ('Ebola Outbreak Expands in Eastern DRC', 'Ebola', 'Democratic Republic of Congo', 0.95, 45, 'critical', true),
  ('Malaria Cases Surge in West Africa', 'Malaria', 'Nigeria', 0.90, 387, 'high', false),
  ('Brazil Detects New COVID-19 Variant', 'COVID-19', 'Brazil', 0.88, 124, 'medium', false),
  ('Cholera Outbreak Linked to Water Contamination in Yemen', 'Cholera', 'Yemen', 0.92, 234, 'high', true),
  ('Seasonal Dengue Outbreak Active in Singapore', 'Dengue', 'Singapore', 0.85, 189, 'medium', false)
) AS v(article_title, disease_name, country_name, confidence_score, case_count, severity, is_new)
JOIN news_articles na ON na.title = v.article_title
JOIN diseases d ON d.name = v.disease_name
JOIN countries c ON c.name = v.country_name;

-- Insert AI predictions
INSERT INTO ai_predictions (disease_id, country_id, prediction_type, prediction_date, target_date, predicted_value, confidence_interval, model_name, model_version, accuracy_score)
SELECT
  d.id,
  c.id,
  v.prediction_type,
  CURRENT_DATE,
  CURRENT_DATE + v.days_ahead::interval,
  v.predicted_value::jsonb,
  v.confidence_interval::jsonb,
  v.model_name,
  v.model_version,
  v.accuracy_score
FROM (VALUES
  ('Ebola', 'Democratic Republic of Congo', 'case_forecast', '7 days', '{"predicted_cases": 580, "trend": "increasing", "growth_rate": 0.18}', '{"lower": 520, "upper": 640}', 'LSTM-Outbreak-Predictor', 'v2.1', 0.87),
  ('Ebola', 'Democratic Republic of Congo', 'spread', '14 days', '{"risk_regions": ["Kinshasa", "Goma"], "spread_probability": 0.72}', '{"lower": 0.65, "upper": 0.80}', 'GeoSpatial-Risk-Model', 'v1.5', 0.82),
  
  ('Malaria', 'Nigeria', 'case_forecast', '7 days', '{"predicted_cases": 1250, "trend": "stable", "growth_rate": 0.05}', '{"lower": 1100, "upper": 1400}', 'LSTM-Outbreak-Predictor', 'v2.1', 0.89),
  ('Malaria', 'Nigeria', 'risk_level', '30 days', '{"overall_risk": "high", "risk_score": 0.78, "factors": ["climate", "mosquito_density"]}', '{"lower": 0.70, "upper": 0.85}', 'Multi-Factor-Risk-Model', 'v3.0', 0.84),
  
  ('COVID-19', 'Brazil', 'case_forecast', '7 days', '{"predicted_cases": 210, "trend": "increasing", "growth_rate": 0.08}', '{"lower": 180, "upper": 250}', 'LSTM-Outbreak-Predictor', 'v2.1', 0.91),
  
  ('Cholera', 'Yemen', 'spread', '7 days', '{"risk_regions": ["Sanaa", "Hodeidah"], "spread_probability": 0.68}', '{"lower": 0.60, "upper": 0.75}', 'GeoSpatial-Risk-Model', 'v1.5', 0.80),
  
  ('Dengue', 'Singapore', 'case_forecast', '7 days', '{"predicted_cases": 245, "trend": "stable", "growth_rate": 0.03}', '{"lower": 220, "upper": 280}', 'LSTM-Outbreak-Predictor', 'v2.1', 0.88)
) AS v(disease_name, country_name, prediction_type, days_ahead, predicted_value, confidence_interval, model_name, model_version, accuracy_score)
JOIN diseases d ON d.name = v.disease_name
JOIN countries c ON c.name = v.country_name;

-- Insert global health metrics (disease_burden_score is 0-100 scale)
INSERT INTO health_metrics (country_id, year, dalys, mortality_rate, disease_burden_score, healthcare_access_index, equity_indicator, life_expectancy, under5_mortality)
SELECT
  c.id,
  2024,
  v.dalys,
  v.mortality_rate,
  v.disease_burden_score,
  v.healthcare_access,
  v.equity,
  v.life_expectancy,
  v.under5_mortality
FROM (VALUES
  ('Democratic Republic of Congo', 58500000, 950.5, 78.5, 0.45, 0.42, 61.5, 72.8),
  ('Nigeria', 45200000, 780.3, 72.3, 0.52, 0.48, 55.2, 68.5),
  ('Brazil', 18900000, 520.8, 55.4, 0.68, 0.62, 76.2, 14.2),
  ('Yemen', 28700000, 890.2, 82.1, 0.38, 0.35, 66.8, 52.3),
  ('Singapore', 2100000, 185.4, 12.5, 0.92, 0.88, 83.8, 2.1),
  ('Kenya', 32400000, 720.5, 58.4, 0.58, 0.51, 68.2, 38.4),
  ('India', 156000000, 620.7, 62.8, 0.64, 0.56, 70.4, 32.1),
  ('United States', 12500000, 320.2, 35.6, 0.85, 0.72, 78.9, 5.6)
) AS v(country_name, dalys, mortality_rate, disease_burden_score, healthcare_access, equity, life_expectancy, under5_mortality)
JOIN countries c ON c.name = v.country_name
ON CONFLICT (country_id, year) DO NOTHING;

-- Insert trend analysis data (last 30 days)
WITH date_series AS (
  SELECT generate_series(
    CURRENT_DATE - interval '30 days',
    CURRENT_DATE,
    interval '1 day'
  )::date as trend_date
),
disease_country_pairs AS (
  SELECT d.id as disease_id, c.id as country_id, d.name as disease_name
  FROM diseases d
  CROSS JOIN countries c
  WHERE d.name IN ('Ebola', 'Malaria', 'COVID-19', 'Cholera', 'Dengue')
  AND c.name IN ('Democratic Republic of Congo', 'Nigeria', 'Brazil', 'Yemen', 'Singapore')
)
INSERT INTO trend_analysis (disease_id, country_id, date, mention_count, search_volume, social_media_volume, severity_trend)
SELECT
  dcp.disease_id,
  dcp.country_id,
  ds.trend_date,
  (random() * 50 + 10)::integer as mention_count,
  (random() * 10000 + 1000)::integer as search_volume,
  (random() * 50000 + 5000)::integer as social_media_volume,
  (random() * 0.4 + 0.3)::decimal as severity_trend
FROM disease_country_pairs dcp
CROSS JOIN date_series ds
ON CONFLICT (disease_id, country_id, date) DO NOTHING;
