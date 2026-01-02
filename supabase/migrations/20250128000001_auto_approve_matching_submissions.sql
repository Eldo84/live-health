/*
  # Auto-approve matching alert submissions
  
  ## Overview
  Automatically approve alert submissions when 2 reports match for the same outbreak and location.
  
  ## Flow
  1. User submits alert → trigger checks for matching submissions
  2. If another submission exists with same disease and location → auto-approve both
  3. Edge function processes auto-approved submissions to create outbreak signals
  
  ## Changes
  - Function to check for matching submissions and auto-approve
  - Trigger to call function on insert
  - Indexes for efficient matching queries
*/

-- ============================================================================
-- INDEXES: Add indexes for efficient matching queries
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_user_alert_submissions_disease_location 
  ON user_alert_submissions(
    COALESCE(disease_id::text, disease_name),
    COALESCE(country_id::text, country_name),
    status
  )
  WHERE status = 'pending_review';

CREATE INDEX IF NOT EXISTS idx_user_alert_submissions_location_coords 
  ON user_alert_submissions(latitude, longitude, status)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND status = 'pending_review';

-- ============================================================================
-- FUNCTION: Check for matching submissions and auto-approve
-- ============================================================================
CREATE OR REPLACE FUNCTION check_and_auto_approve_matching_submissions()
RETURNS TRIGGER AS $$
DECLARE
  matching_submission RECORD;
  matching_count INTEGER;
  distance_threshold DECIMAL := 0.1; -- ~11km radius for location matching
BEGIN
  -- Only process if status is pending_review
  IF NEW.status != 'pending_review' THEN
    RETURN NEW;
  END IF;

  -- Skip if missing critical matching data
  IF (NEW.disease_id IS NULL AND NEW.disease_name IS NULL) 
     OR (NEW.latitude IS NULL OR NEW.longitude IS NULL) THEN
    RETURN NEW;
  END IF;

  -- Find matching pending submissions from DIFFERENT users:
  -- 1. Same disease (either same disease_id OR same disease_name)
  -- 2. Similar location (same country OR coordinates within threshold)
  -- 3. Different user (to prevent self-approval)
  SELECT COUNT(*) INTO matching_count
  FROM user_alert_submissions uas
  WHERE uas.id != NEW.id
    AND uas.status = 'pending_review'
    AND (NEW.user_id IS NULL OR uas.user_id != NEW.user_id)  -- Must be from different user
    AND (
      -- Match by disease_id if both have it
      (NEW.disease_id IS NOT NULL AND uas.disease_id = NEW.disease_id)
      OR
      -- Match by disease_name (case-insensitive)
      (NEW.disease_name IS NOT NULL 
       AND LOWER(TRIM(uas.disease_name)) = LOWER(TRIM(NEW.disease_name)))
    )
    AND (
      -- Match by country_id if both have it
      (NEW.country_id IS NOT NULL AND uas.country_id = NEW.country_id)
      OR
      -- Match by country_name (case-insensitive) if country_id not available
      (NEW.country_id IS NULL AND NEW.country_name IS NOT NULL 
       AND uas.country_name IS NOT NULL
       AND LOWER(TRIM(uas.country_name)) = LOWER(TRIM(NEW.country_name)))
      OR
      -- Match by coordinates (within distance threshold)
      (NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL
       AND uas.latitude IS NOT NULL AND uas.longitude IS NOT NULL
       AND ABS(uas.latitude - NEW.latitude) < distance_threshold
       AND ABS(uas.longitude - NEW.longitude) < distance_threshold)
    );

  -- If we have at least 1 matching submission (plus the new one = 2 total), auto-approve
  IF matching_count >= 1 THEN
    -- Auto-approve the new submission
    NEW.status := 'approved';
    NEW.reviewed_at := now();
    NEW.admin_notes := 'Auto-approved: 2 matching reports for same outbreak and location';
    
    -- Auto-approve all matching pending submissions
    UPDATE user_alert_submissions
    SET 
      status = 'approved',
      reviewed_at = now(),
      admin_notes = 'Auto-approved: 2 matching reports for same outbreak and location',
      updated_at = now()
    WHERE id IN (
      SELECT uas.id
      FROM user_alert_submissions uas
      WHERE uas.id != NEW.id
        AND uas.status = 'pending_review'
        AND (NEW.user_id IS NULL OR uas.user_id != NEW.user_id)  -- Must be from different user
        AND (
          (NEW.disease_id IS NOT NULL AND uas.disease_id = NEW.disease_id)
          OR
          (NEW.disease_name IS NOT NULL 
           AND LOWER(TRIM(uas.disease_name)) = LOWER(TRIM(NEW.disease_name)))
        )
        AND (
          (NEW.country_id IS NOT NULL AND uas.country_id = NEW.country_id)
          OR
          (NEW.country_id IS NULL AND NEW.country_name IS NOT NULL 
           AND uas.country_name IS NOT NULL
           AND LOWER(TRIM(uas.country_name)) = LOWER(TRIM(NEW.country_name)))
          OR
          (NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL
           AND uas.latitude IS NOT NULL AND uas.longitude IS NOT NULL
           AND ABS(uas.latitude - NEW.latitude) < distance_threshold
           AND ABS(uas.longitude - NEW.longitude) < distance_threshold)
        )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Auto-approve matching submissions on insert
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_auto_approve_matching_submissions ON user_alert_submissions;

CREATE TRIGGER trigger_auto_approve_matching_submissions
  BEFORE INSERT ON user_alert_submissions
  FOR EACH ROW
  EXECUTE FUNCTION check_and_auto_approve_matching_submissions();

-- ============================================================================
-- FUNCTION: Notify about auto-approval (optional - can be called from Edge Function)
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_auto_approved_submissions()
RETURNS void AS $$
DECLARE
  submission RECORD;
BEGIN
  -- Find recently auto-approved submissions (within last 5 minutes) that haven't been processed
  FOR submission IN 
    SELECT id, user_id, disease_name, location
    FROM user_alert_submissions
    WHERE status = 'approved'
      AND reviewed_at IS NOT NULL
      AND admin_notes LIKE 'Auto-approved: 2 matching reports%'
      AND outbreak_signal_id IS NULL
      AND reviewed_at > now() - INTERVAL '5 minutes'
    LIMIT 10
  LOOP
    -- Create notification for user
    IF submission.user_id IS NOT NULL THEN
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        action_url,
        action_label,
        priority,
        created_at
      ) VALUES (
        submission.user_id,
        'alert_approved',
        'Alert Auto-Approved! ✓',
        'Your alert about ' || submission.disease_name || ' in ' || submission.location || 
        ' has been automatically approved because it matches another report.',
        '/dashboard',
        'View Dashboard',
        'normal',
        now()
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

