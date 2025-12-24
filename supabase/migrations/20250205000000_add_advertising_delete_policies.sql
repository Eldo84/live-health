/*
  # Add DELETE Policies and Update UPDATE Policy for Advertising Submissions
  
  ## Overview
  Adds Row Level Security policies to allow:
  - Users to delete their own submissions (only if pending or cancelled)
  - Admins to delete any submission globally
  - Users to update rejected and cancelled submissions (to allow resubmission)
  
  ## Policies Added
  1. Users can delete own submissions (pending_review, changes_requested, cancelled, rejected)
  2. Admins can delete any submission
  3. Update existing UPDATE policy to include rejected and cancelled statuses
*/

-- ============================================================================
-- DELETE Policies for advertising_submissions
-- ============================================================================

-- Users can delete their own submissions (only if in certain statuses)
CREATE POLICY "Users can delete own submissions"
  ON advertising_submissions FOR DELETE
  USING (
    (user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid()))
    AND status IN ('pending_review', 'changes_requested', 'cancelled', 'rejected')
  );

-- Admins can delete any submission
CREATE POLICY "Admins can delete any submission"
  ON advertising_submissions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- Update existing UPDATE policy to allow editing rejected/cancelled submissions
-- ============================================================================

-- Drop the old policy
DROP POLICY IF EXISTS "Users can update own pending submissions" ON advertising_submissions;

-- Create updated policy that includes rejected and cancelled statuses
CREATE POLICY "Users can update own submissions"
  ON advertising_submissions FOR UPDATE
  USING (
    (user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid()))
    AND status IN ('pending_review', 'changes_requested', 'approved_pending_payment', 'rejected', 'cancelled')
  );

