-- Remove fallback image from create_sponsored_content_from_submission function
-- When no image is provided, the UI will show title and description instead

CREATE OR REPLACE FUNCTION create_sponsored_content_from_submission(
  p_submission_id uuid,
  p_admin_id uuid DEFAULT auth.uid()
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
    v_submission.ad_image_url, -- No fallback - use NULL if no image provided
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

