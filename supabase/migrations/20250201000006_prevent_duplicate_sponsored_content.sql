-- Prevent duplicate sponsored_content entries for the same submission_id
-- This ensures that each advertising submission can only have one active sponsored_content entry

-- Create a unique partial index on submission_id where it's not null
-- This prevents duplicates while allowing null values (for manually created content)
CREATE UNIQUE INDEX IF NOT EXISTS idx_sponsored_content_unique_submission_id 
ON sponsored_content(submission_id) 
WHERE submission_id IS NOT NULL;

-- Add a comment explaining the constraint
COMMENT ON INDEX idx_sponsored_content_unique_submission_id IS 
'Ensures each advertising submission can only have one sponsored_content entry, preventing duplicates when webhook and verify-payment both try to create content';

