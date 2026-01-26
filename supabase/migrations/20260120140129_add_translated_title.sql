-- Add translated_title column to news_articles table
ALTER TABLE news_articles 
ADD COLUMN IF NOT EXISTS translated_title text;

COMMENT ON COLUMN news_articles.translated_title IS 'English translation of the article title';

