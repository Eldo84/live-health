/*
  # Cascade delete sponsored content when submissions are deleted

  ## Overview
  - Change sponsored_content.submission_id FK to ON DELETE CASCADE
  - Clean up orphaned sponsored_content rows whose submission no longer exists
*/

-- Drop existing FK and recreate with ON DELETE CASCADE
ALTER TABLE sponsored_content
  DROP CONSTRAINT IF EXISTS sponsored_content_submission_id_fkey;

ALTER TABLE sponsored_content
  ADD CONSTRAINT sponsored_content_submission_id_fkey
  FOREIGN KEY (submission_id)
  REFERENCES advertising_submissions(id)
  ON DELETE CASCADE;

-- Clean up any orphaned sponsored content rows (submission removed previously)
DELETE FROM sponsored_content sc
WHERE NOT EXISTS (
  SELECT 1 FROM advertising_submissions s WHERE s.id = sc.submission_id
);

