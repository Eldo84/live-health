/*
  # User Feedback & Improvements System
  
  ## Overview
  System for collecting user feedback, bug reports, feature requests, and suggestions.
  Supports both authenticated users and anonymous submissions.
  
  ## Table
  user_feedback - Stores user feedback submissions
*/

-- ============================================================================
-- TABLE: user_feedback
-- Stores user feedback, bug reports, feature requests, and suggestions
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User Account Link (optional for anonymous submissions)
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text NOT NULL,
  
  -- Feedback Details
  feedback_type text NOT NULL CHECK (feedback_type IN ('bug', 'feature', 'suggestion', 'general')),
  message text NOT NULL,
  
  -- Status Tracking
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'in_progress', 'resolved', 'closed')),
  
  -- Admin Review Fields
  admin_notes text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON user_feedback(status);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_feedback_reviewed_by ON user_feedback(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_user_feedback_feedback_type ON user_feedback(feedback_type);

-- RLS Policies
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Public insert policy (allow anonymous submissions)
CREATE POLICY "Anyone can insert feedback"
  ON user_feedback FOR INSERT
  TO public
  WITH CHECK (true);

-- Users can view their own submissions
CREATE POLICY "Users can view own feedback"
  ON user_feedback FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all submissions
CREATE POLICY "Admins can view all feedback"
  ON user_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update feedback (for review and status updates)
CREATE POLICY "Admins can update feedback"
  ON user_feedback FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_user_feedback_updated_at
  BEFORE UPDATE ON user_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_user_feedback_updated_at();








































