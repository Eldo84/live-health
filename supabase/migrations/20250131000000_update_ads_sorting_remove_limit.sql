-- Update get_active_sponsored_content function to:
-- 1. Remove LIMIT (show all ads)
-- 2. Sort by newest first only (created_at DESC) for all plans

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
  ORDER BY sc.created_at DESC;
  -- Removed LIMIT to show all ads
  -- Removed pinned, plan_type, and display_order sorting - now only newest first
END;
$$;

