-- ============================================================================
-- Create get_weekly_top_diseases RPC Function
-- ============================================================================
-- 
-- This function returns the top 10 diseases from the last 7 days,
-- grouped by disease with total cases (count of reports) and new cases counts.
-- Used by the weekly report generation and weekly top diseases notifications.
-- 
-- Note: "total_cases" and "new_cases" represent the count of outbreak signals
-- (reports), not the sum of case_count_mentioned, as case counts from headlines
-- can be misleading (e.g., "500,000 chickens culled" would incorrectly show
-- as 500,000 "cases").
-- ============================================================================

CREATE OR REPLACE FUNCTION get_weekly_top_diseases()
RETURNS TABLE (
  disease_name text,
  total_cases bigint,
  new_cases bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  seven_days_ago timestamptz;
BEGIN
  -- Calculate date 7 days ago
  seven_days_ago := NOW() - INTERVAL '7 days';
  
  -- Return top 10 diseases from the last 7 days
  -- Group by disease and count the number of outbreak signals (reports)
  -- This matches the logic used in useDashboardDiseases.ts
  RETURN QUERY
  WITH disease_stats AS (
    SELECT 
      COALESCE(d.name, 'Unknown Disease') AS disease_name,
      COUNT(*) AS report_count,
      SUM(COALESCE(os.case_count_mentioned, 0)) AS total_case_count_mentioned
    FROM outbreak_signals os
    LEFT JOIN diseases d ON os.disease_id = d.id
    WHERE os.detected_at IS NOT NULL
      AND os.detected_at >= seven_days_ago
      AND os.detected_at < NOW()
    GROUP BY COALESCE(d.name, 'Unknown Disease')
  )
  SELECT 
    ds.disease_name,
    ds.report_count::bigint AS total_cases,  -- Count of reports (outbreak signals)
    ds.report_count::bigint AS new_cases    -- For weekly report, new_cases = total_cases in the period
  FROM disease_stats ds
  WHERE ds.report_count > 0  -- Only return diseases with at least one report
  ORDER BY ds.report_count DESC, ds.disease_name ASC
  LIMIT 10;
END;
$$;

-- Add comment
COMMENT ON FUNCTION get_weekly_top_diseases() IS 
  'Returns the top 10 diseases from the last 7 days, grouped by disease with total and new case counts. The counts represent the number of outbreak signals (reports), not the sum of case_count_mentioned. Used by weekly report generation and notifications.';

