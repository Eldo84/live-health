-- Allow authenticated users to insert user-submitted alerts
-- This enables the "Add an alert to the map" feature

-- First, update the news_sources table to allow 'user_submission' type
ALTER TABLE news_sources DROP CONSTRAINT IF EXISTS news_sources_type_check;
ALTER TABLE news_sources ADD CONSTRAINT news_sources_type_check 
  CHECK (type IN ('news', 'government', 'international_org', 'research', 'user_submission'));

-- Also allow empty URL for user submissions
ALTER TABLE news_sources ALTER COLUMN url DROP NOT NULL;

-- Allow users to insert news articles (for user submissions)
DROP POLICY IF EXISTS "Authenticated users can insert news articles" ON news_articles;
CREATE POLICY "Authenticated users can insert news articles"
  ON news_articles FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow users to insert outbreak signals (for user submissions)
DROP POLICY IF EXISTS "Authenticated users can insert outbreak signals" ON outbreak_signals;
CREATE POLICY "Authenticated users can insert outbreak signals"
  ON outbreak_signals FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow users to insert diseases (for custom diseases)
DROP POLICY IF EXISTS "Authenticated users can insert diseases" ON diseases;
CREATE POLICY "Authenticated users can insert diseases"
  ON diseases FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow users to insert countries (if location doesn't exist)
DROP POLICY IF EXISTS "Authenticated users can insert countries" ON countries;
CREATE POLICY "Authenticated users can insert countries"
  ON countries FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow users to insert news sources (for user submissions source)
DROP POLICY IF EXISTS "Authenticated users can insert news sources" ON news_sources;
CREATE POLICY "Authenticated users can insert news sources"
  ON news_sources FOR INSERT
  TO authenticated
  WITH CHECK (true);

