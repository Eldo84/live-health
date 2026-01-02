/*
  # Allow Admins to Delete User Alert Submissions
  
  ## Overview
  Adds an RLS policy so admins can delete alert submissions created by other users.
*/

-- Drop existing policy if it already exists to avoid duplicates when re-running migrations
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Admins can delete alert submissions' 
      AND tablename = 'user_alert_submissions'
  ) THEN
    DROP POLICY "Admins can delete alert submissions" ON user_alert_submissions;
  END IF;
END$$;

-- Admins can delete any alert submission
CREATE POLICY "Admins can delete alert submissions"
  ON user_alert_submissions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

















