-- ============================================================================
-- NOTIFICATIONS SYSTEM FOR AUTHENTICATED ADVERTISING
-- ============================================================================

-- ============================================================================
-- TABLE 1: notifications
-- Stores all user notifications for real-time updates
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Notification details
  type text NOT NULL CHECK (type IN (
    'submission_created',
    'submission_approved',
    'submission_rejected',
    'payment_required',
    'payment_received',
    'ad_live',
    'ad_expiring',
    'ad_expired'
  )),
  
  title text NOT NULL,
  message text NOT NULL,
  action_url text, -- Link to relevant page (e.g., payment page, dashboard)
  action_label text, -- Button text (e.g., "Pay Now", "View Details")
  
  -- Related entities
  submission_id uuid REFERENCES advertising_submissions(id) ON DELETE CASCADE,
  payment_id uuid REFERENCES payments(id) ON DELETE SET NULL,
  
  -- Status
  read boolean DEFAULT false,
  read_at timestamptz,
  
  -- Priority (for sorting)
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Metadata
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_submission_id ON notifications(submission_id);

-- RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow inserts (will be restricted by triggers/functions)
CREATE POLICY "Allow notification inserts"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- TABLE 2: user_submission_stats
-- Tracks user submission statistics for rate limiting and reputation
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_submission_stats (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  total_submissions integer DEFAULT 0,
  approved_submissions integer DEFAULT 0,
  rejected_submissions integer DEFAULT 0,
  last_submission_at timestamptz,
  reputation_score integer DEFAULT 100, -- 0-100
  is_flagged boolean DEFAULT false,
  flag_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_submission_stats_reputation ON user_submission_stats(reputation_score);
CREATE INDEX IF NOT EXISTS idx_user_submission_stats_flagged ON user_submission_stats(is_flagged);

-- RLS Policies
ALTER TABLE user_submission_stats ENABLE ROW LEVEL SECURITY;

-- Users can view their own stats
CREATE POLICY "Users can view own stats"
  ON user_submission_stats FOR SELECT
  USING (user_id = auth.uid());

-- System can update stats (via triggers/functions)
CREATE POLICY "System can update stats"
  ON user_submission_stats FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to check if user can submit
CREATE OR REPLACE FUNCTION can_user_submit(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats user_submission_stats%ROWTYPE;
  v_pending_count integer;
BEGIN
  -- Get or create user stats
  INSERT INTO user_submission_stats (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  SELECT * INTO v_stats
  FROM user_submission_stats
  WHERE user_id = p_user_id;
  
  -- Check pending submissions
  SELECT COUNT(*) INTO v_pending_count
  FROM advertising_submissions
  WHERE user_id = p_user_id
    AND status IN ('pending_review', 'approved_pending_payment', 'changes_requested');
  
  -- Check rate limits
  IF v_stats.total_submissions >= 5 AND 
     v_stats.last_submission_at > NOW() - INTERVAL '30 days' THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Maximum 5 submissions per 30 days. You have ' || v_stats.total_submissions || ' submissions in the last 30 days.'
    );
  END IF;
  
  IF v_pending_count >= 2 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'You have ' || v_pending_count || ' pending submissions. Please wait for review before submitting more.'
    );
  END IF;
  
  IF v_stats.is_flagged THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Your account is flagged: ' || COALESCE(v_stats.flag_reason, 'Multiple rejections. Please contact support.')
    );
  END IF;
  
  RETURN jsonb_build_object('allowed', true);
END;
$$;

-- Function to update user stats
CREATE OR REPLACE FUNCTION update_user_submission_stats(
  p_user_id uuid,
  p_action text -- 'submitted', 'approved', 'rejected'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Ensure stats record exists
  INSERT INTO user_submission_stats (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Update stats based on action
  CASE p_action
    WHEN 'submitted' THEN
      UPDATE user_submission_stats
      SET 
        total_submissions = total_submissions + 1,
        last_submission_at = NOW(),
        updated_at = NOW()
      WHERE user_id = p_user_id;
    
    WHEN 'approved' THEN
      UPDATE user_submission_stats
      SET 
        approved_submissions = approved_submissions + 1,
        reputation_score = LEAST(100, reputation_score + 5),
        updated_at = NOW()
      WHERE user_id = p_user_id;
    
    WHEN 'rejected' THEN
      UPDATE user_submission_stats
      SET 
        rejected_submissions = rejected_submissions + 1,
        reputation_score = GREATEST(0, reputation_score - 10),
        updated_at = NOW(),
        -- Auto-flag if reputation drops below 50
        is_flagged = CASE WHEN reputation_score - 10 < 50 THEN true ELSE is_flagged END,
        flag_reason = CASE WHEN reputation_score - 10 < 50 THEN 'Low reputation score due to multiple rejections' ELSE flag_reason END
      WHERE user_id = p_user_id;
  END CASE;
END;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger: Auto-create notification when submission is created
CREATE OR REPLACE FUNCTION notify_submission_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notification
  INSERT INTO notifications (
    user_id, type, title, message, action_url, action_label, submission_id, priority
  ) VALUES (
    NEW.user_id,
    'submission_created',
    'Application Submitted',
    'Your advertising application for ' || NEW.company_name || ' has been received. We''ll review it within 24-48 hours.',
    '/dashboard/advertising?tab=submissions',
    'View Submission',
    NEW.id,
    'normal'
  );
  
  -- Update user stats
  PERFORM update_user_submission_stats(NEW.user_id, 'submitted');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_submission_created
  AFTER INSERT ON advertising_submissions
  FOR EACH ROW
  WHEN (NEW.user_id IS NOT NULL)
  EXECUTE FUNCTION notify_submission_created();

-- Trigger: Auto-create notification when submission status changes
CREATE OR REPLACE FUNCTION notify_submission_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_sponsored_content_id uuid;
BEGIN
  IF NEW.status != OLD.status AND NEW.user_id IS NOT NULL THEN
    CASE NEW.status
      WHEN 'approved_pending_payment' THEN
        -- Create approval notification
        INSERT INTO notifications (
          user_id, type, title, message, action_url, action_label, submission_id, priority
        ) VALUES (
          NEW.user_id,
          'submission_approved',
          'Application Approved! 🎉',
          'Your advertising application for ' || NEW.company_name || ' has been approved. Complete payment to activate your ad.',
          '/advertising/payment/' || NEW.id,
          'Pay Now',
          NEW.id,
          'high'
        );
        
        -- Also create payment required notification
        INSERT INTO notifications (
          user_id, type, title, message, action_url, action_label, submission_id, priority
        ) VALUES (
          NEW.user_id,
          'payment_required',
          'Payment Required',
          'Your approved application is waiting for payment. Complete payment within 7 days.',
          '/advertising/payment/' || NEW.id,
          'Pay Now',
          NEW.id,
          'urgent'
        );
        
        -- Update stats
        PERFORM update_user_submission_stats(NEW.user_id, 'approved');
      
      WHEN 'rejected' THEN
        INSERT INTO notifications (
          user_id, type, title, message, action_url, action_label, submission_id, priority
        ) VALUES (
          NEW.user_id,
          'submission_rejected',
          'Application Update',
          'Your application for ' || NEW.company_name || ' was not approved. ' || 
          COALESCE(NEW.rejection_reason, 'Please review our advertising guidelines and try again.'),
          '/dashboard/advertising?tab=submissions',
          'View Details',
          NEW.id,
          'normal'
        );
        
        -- Update stats
        PERFORM update_user_submission_stats(NEW.user_id, 'rejected');
      
      WHEN 'active' THEN
        -- Get sponsored content ID if exists
        SELECT id INTO v_sponsored_content_id
        FROM sponsored_content
        WHERE submission_id = NEW.id
        LIMIT 1;
        
        INSERT INTO notifications (
          user_id, type, title, message, action_url, action_label, submission_id, priority
        ) VALUES (
          NEW.user_id,
          'ad_live',
          'Your Ad is Now Live! 🚀',
          'Your advertisement for ' || NEW.company_name || ' is now active on OutbreakNow.',
          COALESCE('/dashboard/advertising?tab=ads', '/dashboard/advertising'),
          'View Analytics',
          NEW.id,
          'high'
        );
    END CASE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_submission_status_change
  AFTER UPDATE ON advertising_submissions
  FOR EACH ROW
  WHEN (NEW.status != OLD.status AND NEW.user_id IS NOT NULL)
  EXECUTE FUNCTION notify_submission_status_change();

-- Trigger: Auto-create notification when payment is received
CREATE OR REPLACE FUNCTION notify_payment_received()
RETURNS TRIGGER AS $$
DECLARE
  v_submission advertising_submissions%ROWTYPE;
BEGIN
  IF NEW.status = 'succeeded' AND OLD.status != 'succeeded' THEN
    -- Get submission details
    SELECT * INTO v_submission
    FROM advertising_submissions
    WHERE id = NEW.submission_id
    LIMIT 1;
    
    IF v_submission.id IS NOT NULL THEN
      INSERT INTO notifications (
        user_id, type, title, message, action_url, action_label, submission_id, payment_id, priority
      ) VALUES (
        NEW.user_id,
        'payment_received',
        'Payment Confirmed ✅',
        'Your payment of $' || NEW.amount || ' has been received. Your ad will go live shortly!',
        '/dashboard/advertising?tab=ads',
        'View Ad',
        NEW.submission_id,
        NEW.id,
        'high'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_payment_received
  AFTER UPDATE ON payments
  FOR EACH ROW
  WHEN (NEW.status = 'succeeded' AND OLD.status != 'succeeded')
  EXECUTE FUNCTION notify_payment_received();

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_submission_stats_updated_at
  BEFORE UPDATE ON user_submission_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE notifications IS 'Stores user notifications for real-time updates in the advertising system';
COMMENT ON TABLE user_submission_stats IS 'Tracks user submission statistics for rate limiting and reputation scoring';

