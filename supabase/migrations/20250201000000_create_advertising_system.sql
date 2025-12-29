/*
  # Advertising System Schema
  
  ## Overview
  Complete advertising system with:
  - Form submissions
  - Admin approval workflow (Pay AFTER Approval)
  - Stripe payment integration
  - Sponsored content display
  - Analytics tracking
  - User roles for admin access

  ## Flow
  1. User submits form → status='pending_review'
  2. Admin reviews → 'approved_pending_payment' or 'rejected'
  3. User pays (only if approved) → status='active'
  4. Ad displays on map

  ## Tables
  1. user_roles - Admin access control
  2. advertising_submissions - Form submissions
  3. subscriptions - Stripe subscription data
  4. payments - Payment transaction history
  5. sponsored_content - Approved ads on map
  6. advertising_analytics - View/click tracking
*/

-- ============================================================================
-- TABLE 1: user_roles
-- Manages admin access and permissions
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
  permissions jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Users can see their own role
CREATE POLICY "Users can view own role"
  ON user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all roles
CREATE POLICY "Admins can view all roles"
  ON user_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update roles
CREATE POLICY "Admins can update roles"
  ON user_roles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can insert roles
CREATE POLICY "Admins can insert roles"
  ON user_roles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- TABLE 2: advertising_submissions
-- Stores form submissions from advertisers
-- ============================================================================
CREATE TABLE IF NOT EXISTS advertising_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User Account Link (required for payment)
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Contact Information
  company_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  website text,
  
  -- Submission Details
  description text,
  selected_plan text NOT NULL CHECK (selected_plan IN ('basic', 'professional', 'enterprise')),
  document_url text,
  
  -- Ad Content (can be updated after approval)
  ad_title text,
  ad_image_url text,
  ad_click_url text,
  ad_location text DEFAULT 'Global',
  
  -- Status Tracking (Pay After Approval Flow)
  status text DEFAULT 'pending_review' CHECK (status IN (
    'pending_review',           -- Initial state, waiting for admin
    'approved_pending_payment', -- Admin approved, waiting for payment
    'changes_requested',        -- Admin requested changes
    'rejected',                 -- Admin rejected
    'active',                   -- Paid and live
    'expired',                  -- Past end date
    'cancelled'                 -- User cancelled
  )),
  
  -- Payment Status
  payment_status text DEFAULT 'not_required' CHECK (payment_status IN (
    'not_required',    -- Before approval
    'pending',         -- Approved, awaiting payment
    'paid',            -- Payment completed
    'failed',          -- Payment failed
    'refunded',        -- Refunded
    'cancelled'        -- Cancelled
  )),
  
  -- Admin Review
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  admin_notes text,
  rejection_reason text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_advertising_submissions_status ON advertising_submissions(status);
CREATE INDEX IF NOT EXISTS idx_advertising_submissions_payment_status ON advertising_submissions(payment_status);
CREATE INDEX IF NOT EXISTS idx_advertising_submissions_user_id ON advertising_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_advertising_submissions_email ON advertising_submissions(email);
CREATE INDEX IF NOT EXISTS idx_advertising_submissions_created_at ON advertising_submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_advertising_submissions_selected_plan ON advertising_submissions(selected_plan);

-- RLS
ALTER TABLE advertising_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (submit form)
CREATE POLICY "Anyone can submit advertising form"
  ON advertising_submissions FOR INSERT
  WITH CHECK (true);

-- Users can view their own submissions
CREATE POLICY "Users can view own submissions"
  ON advertising_submissions FOR SELECT
  USING (
    user_id = auth.uid() OR
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Users can update their own pending submissions
CREATE POLICY "Users can update own pending submissions"
  ON advertising_submissions FOR UPDATE
  USING (
    (user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid()))
    AND status IN ('pending_review', 'changes_requested', 'approved_pending_payment')
  );

-- Admins can view all submissions
CREATE POLICY "Admins can view all submissions"
  ON advertising_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update all submissions
CREATE POLICY "Admins can update all submissions"
  ON advertising_submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- TABLE 3: subscriptions
-- Stores Stripe subscription data
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User & Submission
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  submission_id uuid REFERENCES advertising_submissions(id) ON DELETE SET NULL,
  
  -- Plan Information
  plan_type text NOT NULL CHECK (plan_type IN ('basic', 'professional', 'enterprise')),
  plan_price decimal(10,2) NOT NULL,
  
  -- Stripe Integration
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_payment_method_id text,
  
  -- Subscription Status
  status text DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'unpaid', 'trialing', 'incomplete')),
  current_period_start date NOT NULL,
  current_period_end date NOT NULL,
  cancel_at_period_end boolean DEFAULT false,
  cancelled_at timestamptz,
  
  -- Billing
  billing_cycle text DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  next_billing_date date,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_submission_id ON subscriptions(submission_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_current_period_end ON subscriptions(current_period_end);

-- RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- Service role can insert/update (for webhooks)
CREATE POLICY "Service role can manage subscriptions"
  ON subscriptions FOR ALL
  USING (true)
  WITH CHECK (true);

-- Admins can view all subscriptions
CREATE POLICY "Admins can view all subscriptions"
  ON subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- TABLE 4: payments
-- Stores payment transaction history
-- ============================================================================
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User & References
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  submission_id uuid REFERENCES advertising_submissions(id) ON DELETE SET NULL,
  
  -- Payment Details
  amount decimal(10,2) NOT NULL,
  currency text DEFAULT 'usd',
  plan_type text NOT NULL CHECK (plan_type IN ('basic', 'professional', 'enterprise')),
  
  -- Stripe Integration
  stripe_payment_intent_id text UNIQUE,
  stripe_charge_id text,
  stripe_invoice_id text,
  stripe_checkout_session_id text,
  
  -- Payment Status
  status text NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded', 'partially_refunded')),
  
  -- Payment Method
  payment_method text,
  payment_method_last4 text,
  
  -- Metadata
  description text,
  receipt_url text,
  paid_at timestamptz,
  refunded_at timestamptz,
  refund_amount decimal(10,2),
  
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_submission_id ON payments(submission_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent_id ON payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own payments
CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  USING (user_id = auth.uid());

-- Service role can insert/update (for webhooks)
CREATE POLICY "Service role can manage payments"
  ON payments FOR ALL
  USING (true)
  WITH CHECK (true);

-- Admins can view all payments
CREATE POLICY "Admins can view all payments"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- TABLE 5: sponsored_content
-- Stores approved ads that display on the map
-- ============================================================================
CREATE TABLE IF NOT EXISTS sponsored_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Links
  submission_id uuid REFERENCES advertising_submissions(id) ON DELETE SET NULL,
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Plan Information
  plan_type text NOT NULL CHECK (plan_type IN ('basic', 'professional', 'enterprise')),
  
  -- Content Details
  title text NOT NULL,
  description text,
  image_url text NOT NULL,
  play_icon_url text,
  location text DEFAULT 'Global',
  click_url text,
  
  -- Display Settings (Plan-based)
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  start_date date DEFAULT CURRENT_DATE,
  end_date date,
  
  -- Plan-based Features
  is_featured boolean DEFAULT false,
  is_pinned boolean DEFAULT false,
  max_duration_days integer,
  display_locations text[] DEFAULT ARRAY['map'],
  
  -- Analytics (cached counters)
  click_count integer DEFAULT 0,
  view_count integer DEFAULT 0,
  analytics_level text DEFAULT 'basic' CHECK (analytics_level IN ('basic', 'advanced', 'custom')),
  
  -- Metadata
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sponsored_content_is_active ON sponsored_content(is_active);
CREATE INDEX IF NOT EXISTS idx_sponsored_content_display_order ON sponsored_content(display_order);
CREATE INDEX IF NOT EXISTS idx_sponsored_content_start_date ON sponsored_content(start_date);
CREATE INDEX IF NOT EXISTS idx_sponsored_content_end_date ON sponsored_content(end_date);
CREATE INDEX IF NOT EXISTS idx_sponsored_content_submission_id ON sponsored_content(submission_id);
CREATE INDEX IF NOT EXISTS idx_sponsored_content_plan_type ON sponsored_content(plan_type);
CREATE INDEX IF NOT EXISTS idx_sponsored_content_is_pinned ON sponsored_content(is_pinned);
CREATE INDEX IF NOT EXISTS idx_sponsored_content_user_id ON sponsored_content(user_id);

-- RLS
ALTER TABLE sponsored_content ENABLE ROW LEVEL SECURITY;

-- Public can view active sponsored content
CREATE POLICY "Public can view active sponsored content"
  ON sponsored_content FOR SELECT
  USING (
    is_active = true 
    AND (start_date IS NULL OR start_date <= CURRENT_DATE)
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  );

-- Users can view their own sponsored content
CREATE POLICY "Users can view own sponsored content"
  ON sponsored_content FOR SELECT
  USING (user_id = auth.uid());

-- Admins can manage all sponsored content
CREATE POLICY "Admins can manage all sponsored content"
  ON sponsored_content FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- TABLE 6: advertising_analytics
-- Stores view/click events for sponsored content
-- ============================================================================
CREATE TABLE IF NOT EXISTS advertising_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Content Reference
  sponsored_content_id uuid REFERENCES sponsored_content(id) ON DELETE CASCADE NOT NULL,
  submission_id uuid REFERENCES advertising_submissions(id) ON DELETE CASCADE,
  content_owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Event Type
  event_type text NOT NULL CHECK (event_type IN ('view', 'click', 'impression', 'engagement')),
  
  -- Event Details
  event_data jsonb,
  referrer text,
  user_agent text,
  
  -- Location Data (anonymized)
  country text,
  city text,
  
  -- Timestamp
  occurred_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_advertising_analytics_sponsored_content_id ON advertising_analytics(sponsored_content_id);
CREATE INDEX IF NOT EXISTS idx_advertising_analytics_content_owner_id ON advertising_analytics(content_owner_id);
CREATE INDEX IF NOT EXISTS idx_advertising_analytics_event_type ON advertising_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_advertising_analytics_occurred_at ON advertising_analytics(occurred_at);
CREATE INDEX IF NOT EXISTS idx_advertising_analytics_submission_id ON advertising_analytics(submission_id);

-- RLS
ALTER TABLE advertising_analytics ENABLE ROW LEVEL SECURITY;

-- Anyone can insert analytics events
CREATE POLICY "Anyone can insert analytics events"
  ON advertising_analytics FOR INSERT
  WITH CHECK (true);

-- Users can view analytics for their own content
CREATE POLICY "Users can view own analytics"
  ON advertising_analytics FOR SELECT
  USING (content_owner_id = auth.uid());

-- Admins can view all analytics
CREATE POLICY "Admins can view all analytics"
  ON advertising_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to get plan defaults
CREATE OR REPLACE FUNCTION get_plan_defaults(plan text)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
BEGIN
  CASE plan
    WHEN 'basic' THEN
      RETURN jsonb_build_object(
        'price', 30.00,
        'duration_days', 30,
        'display_order', 200,
        'is_featured', false,
        'is_pinned', false,
        'display_locations', ARRAY['map'],
        'analytics_level', 'basic'
      );
    WHEN 'professional' THEN
      RETURN jsonb_build_object(
        'price', 75.00,
        'duration_days', 60,
        'display_order', 100,
        'is_featured', true,
        'is_pinned', false,
        'display_locations', ARRAY['map', 'homepage'],
        'analytics_level', 'advanced'
      );
    WHEN 'enterprise' THEN
      RETURN jsonb_build_object(
        'price', 150.00,
        'duration_days', 90,
        'display_order', 50,
        'is_featured', true,
        'is_pinned', true,
        'display_locations', ARRAY['map', 'homepage', 'newsletter'],
        'analytics_level', 'custom'
      );
    ELSE
      RETURN jsonb_build_object('error', 'Invalid plan');
  END CASE;
END;
$$;

-- Function to create sponsored content from approved submission
CREATE OR REPLACE FUNCTION create_sponsored_content_from_submission(
  p_submission_id uuid,
  p_admin_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_submission advertising_submissions%ROWTYPE;
  v_plan_defaults jsonb;
  v_sponsored_id uuid;
  v_start_date date := CURRENT_DATE;
BEGIN
  -- Get submission
  SELECT * INTO v_submission
  FROM advertising_submissions
  WHERE id = p_submission_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found';
  END IF;
  
  IF v_submission.status != 'active' THEN
    RAISE EXCEPTION 'Submission must be active (paid) to create sponsored content';
  END IF;
  
  -- Get plan defaults
  v_plan_defaults := get_plan_defaults(v_submission.selected_plan);
  
  -- Create sponsored content
  INSERT INTO sponsored_content (
    submission_id,
    user_id,
    plan_type,
    title,
    description,
    image_url,
    location,
    click_url,
    display_order,
    is_active,
    start_date,
    end_date,
    is_featured,
    is_pinned,
    max_duration_days,
    display_locations,
    analytics_level,
    created_by
  ) VALUES (
    p_submission_id,
    v_submission.user_id,
    v_submission.selected_plan,
    COALESCE(v_submission.ad_title, v_submission.company_name || ' Advertisement'),
    v_submission.description,
    COALESCE(v_submission.ad_image_url, '/image.png'),
    COALESCE(v_submission.ad_location, 'Global'),
    v_submission.ad_click_url,
    (v_plan_defaults->>'display_order')::integer,
    true,
    v_start_date,
    v_start_date + ((v_plan_defaults->>'duration_days')::integer || ' days')::interval,
    (v_plan_defaults->>'is_featured')::boolean,
    (v_plan_defaults->>'is_pinned')::boolean,
    (v_plan_defaults->>'duration_days')::integer,
    ARRAY(SELECT jsonb_array_elements_text(v_plan_defaults->'display_locations')),
    v_plan_defaults->>'analytics_level',
    p_admin_id
  )
  RETURNING id INTO v_sponsored_id;
  
  RETURN v_sponsored_id;
END;
$$;

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_sponsored_view(p_content_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE sponsored_content
  SET view_count = view_count + 1, updated_at = now()
  WHERE id = p_content_id;
END;
$$;

-- Function to increment click count
CREATE OR REPLACE FUNCTION increment_sponsored_click(p_content_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE sponsored_content
  SET click_count = click_count + 1, updated_at = now()
  WHERE id = p_content_id;
END;
$$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id AND role = 'admin'
  );
END;
$$;

-- Function to get active sponsored content for map
CREATE OR REPLACE FUNCTION get_active_sponsored_content(p_location text DEFAULT 'map')
RETURNS SETOF sponsored_content
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT sc.*
  FROM sponsored_content sc
  WHERE sc.is_active = true
    AND (sc.start_date IS NULL OR sc.start_date <= CURRENT_DATE)
    AND (sc.end_date IS NULL OR sc.end_date >= CURRENT_DATE)
    AND p_location = ANY(sc.display_locations)
  ORDER BY 
    sc.is_pinned DESC,
    CASE sc.plan_type
      WHEN 'enterprise' THEN 1
      WHEN 'professional' THEN 2
      WHEN 'basic' THEN 3
    END,
    sc.display_order ASC,
    sc.created_at DESC
  LIMIT 10;
END;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS update_advertising_submissions_updated_at ON advertising_submissions;
CREATE TRIGGER update_advertising_submissions_updated_at
  BEFORE UPDATE ON advertising_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sponsored_content_updated_at ON sponsored_content;
CREATE TRIGGER update_sponsored_content_updated_at
  BEFORE UPDATE ON sponsored_content
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_roles_updated_at ON user_roles;
CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Note: Storage buckets need to be created via Supabase Dashboard or API
-- These are the configurations needed:

-- Bucket: advertising-documents
-- - Public: false
-- - File size limit: 10MB
-- - Allowed types: application/pdf, application/msword, 
--   application/vnd.openxmlformats-officedocument.wordprocessingml.document,
--   image/jpeg, image/png

-- Bucket: sponsored-images  
-- - Public: true
-- - File size limit: 5MB
-- - Allowed types: image/jpeg, image/png, image/webp

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert a default admin role for testing (replace with actual admin user ID)
-- INSERT INTO user_roles (user_id, role) VALUES ('YOUR_ADMIN_USER_ID', 'admin');

COMMENT ON TABLE advertising_submissions IS 'Stores advertising form submissions with Pay After Approval workflow';
COMMENT ON TABLE sponsored_content IS 'Stores approved and paid advertisements displayed on the map';
COMMENT ON TABLE subscriptions IS 'Stores Stripe subscription data for recurring billing';
COMMENT ON TABLE payments IS 'Stores all payment transactions';
COMMENT ON TABLE advertising_analytics IS 'Stores view and click analytics for sponsored content';
COMMENT ON TABLE user_roles IS 'Manages user roles for admin access control';

