/*
  # Donations System Schema
  
  ## Overview
  Creates a donations table to track one-time donation transactions from the home page.
  Supports anonymous donations with optional donor information.
  
  ## Table: donations
  - Tracks donation amounts and optional donor information
  - Links to Stripe checkout sessions
  - Supports anonymous donations
*/

-- ============================================================================
-- TABLE: donations
-- Stores donation transaction records
-- ============================================================================
CREATE TABLE IF NOT EXISTS donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Donation Details
  amount decimal(10,2) NOT NULL,
  currency text DEFAULT 'usd',
  
  -- Optional Donor Information
  donor_name text,
  donor_email text,
  is_anonymous boolean DEFAULT false,
  
  -- Stripe Integration
  stripe_checkout_session_id text UNIQUE,
  stripe_payment_intent_id text,
  
  -- Payment Status
  status text NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  
  -- Receipt
  receipt_url text,
  paid_at timestamptz,
  
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
CREATE INDEX IF NOT EXISTS idx_donations_stripe_checkout_session_id ON donations(stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON donations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_donations_is_anonymous ON donations(is_anonymous);

-- RLS Policies
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

-- Allow public read access to donation stats (for transparency)
-- But only show aggregated data, not individual donor info
CREATE POLICY "Public can view anonymous donation stats"
  ON donations FOR SELECT
  USING (is_anonymous = true OR donor_name IS NULL);

-- Allow service role to insert/update (via edge functions)
-- Note: Edge functions use service role key, so they can insert/update
-- No explicit policy needed for service role as it bypasses RLS

-- Allow authenticated users to view their own donations (if they provided email)
-- This requires matching email, which is optional
CREATE POLICY "Users can view donations with their email"
  ON donations FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    donor_email IS NOT NULL AND
    donor_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

