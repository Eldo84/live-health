-- Add multilingual support columns to news_articles table
ALTER TABLE news_articles 
ADD COLUMN IF NOT EXISTS original_text text,
ADD COLUMN IF NOT EXISTS translated_text text,
ADD COLUMN IF NOT EXISTS language text;

-- Add index on language for faster filtering
CREATE INDEX IF NOT EXISTS idx_news_articles_language ON news_articles(language);

-- Add comment to explain the columns
COMMENT ON COLUMN news_articles.original_text IS 'Original multilingual article text before translation';
COMMENT ON COLUMN news_articles.translated_text IS 'English translation of the article text';
COMMENT ON COLUMN news_articles.language IS 'Language code of the original article (e.g., en, fr, es, ar, de, pt)';

