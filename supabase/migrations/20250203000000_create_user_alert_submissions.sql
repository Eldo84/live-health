/*
  # User Alert Submissions with Admin Review
  
  ## Overview
  System for users to submit alerts that require admin review before appearing on the map.
  
  ## Flow
  1. User submits alert → status='pending_review'
  2. Admin reviews → 'approved' or 'rejected'
  3. When approved → automatically creates outbreak signal and related data
  4. Alert appears on map
  
  ## Table
  user_alert_submissions - Stores user-submitted alerts pending review
*/

-- ============================================================================
-- TABLE: user_alert_submissions
-- Stores user-submitted alerts that need admin review
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_alert_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User Account Link
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text NOT NULL,
  
  -- Alert Details (from form)
  url text NOT NULL,
  headline text NOT NULL,
  location text NOT NULL,
  date date NOT NULL,
  disease_id uuid REFERENCES diseases(id) ON DELETE SET NULL,
  disease_name text NOT NULL, -- Store disease name in case disease doesn't exist yet
  description text NOT NULL,
  
  -- Geocoding Results
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  country_name text,
  country_id uuid REFERENCES countries(id) ON DELETE SET NULL,
  
  -- Review Status
  status text NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected')),
  
  -- Admin Review Fields
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  admin_notes text,
  rejection_reason text,
  
  -- Related Data (created when approved)
  article_id uuid REFERENCES news_articles(id) ON DELETE SET NULL,
  source_id uuid REFERENCES news_sources(id) ON DELETE SET NULL,
  outbreak_signal_id uuid, -- Reference to outbreak_signals (no FK to avoid circular dependency)
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_alert_submissions_user_id ON user_alert_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_alert_submissions_status ON user_alert_submissions(status);
CREATE INDEX IF NOT EXISTS idx_user_alert_submissions_created_at ON user_alert_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_alert_submissions_reviewed_by ON user_alert_submissions(reviewed_by);

-- RLS Policies
ALTER TABLE user_alert_submissions ENABLE ROW LEVEL SECURITY;

-- Users can view their own submissions
CREATE POLICY "Users can view own alert submissions"
  ON user_alert_submissions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own submissions
CREATE POLICY "Users can insert own alert submissions"
  ON user_alert_submissions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all submissions
CREATE POLICY "Admins can view all alert submissions"
  ON user_alert_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update submissions (for review)
CREATE POLICY "Admins can update alert submissions"
  ON user_alert_submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_alert_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_user_alert_submissions_updated_at
  BEFORE UPDATE ON user_alert_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_alert_submissions_updated_at();

