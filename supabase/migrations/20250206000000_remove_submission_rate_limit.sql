-- ============================================================================
-- Remove 5 submissions per 30 days rate limit
-- ============================================================================

-- Update can_user_submit function to remove the 30-day submission limit
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
  
  -- Rate limit check removed - no longer limiting submissions per 30 days
  
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



