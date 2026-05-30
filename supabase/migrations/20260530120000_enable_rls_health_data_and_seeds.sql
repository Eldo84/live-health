-- Lock down the two tables flagged by the Supabase security advisor.
-- `public.health_data` and `public.country_year_seeds` had Row Level Security
-- DISABLED, leaving them fully exposed (read AND write) to the anon and
-- authenticated roles used by the browser Supabase client. Anyone with the
-- public anon key could read or modify every row.
--
-- App access paths are preserved after this change:
--   * Reads go through the `health_data_public` VIEW, which is owned by
--     `postgres` and runs with the owner's rights (security_invoker = off),
--     so it is unaffected by RLS on the base tables.
--   * Writes go through the `seed-health-data` Edge Function, which uses the
--     service_role key and bypasses RLS entirely.
-- Enabling RLS with no policies therefore denies direct anon/authenticated
-- access while leaving every legitimate path working.

ALTER TABLE public.health_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_year_seeds ENABLE ROW LEVEL SECURITY;

-- Revoke any stray direct grants on the base tables from the client roles.
REVOKE ALL ON public.health_data FROM anon, authenticated;
REVOKE ALL ON public.country_year_seeds FROM anon, authenticated;

-- Keep the read path (the public view) available to the client roles.
GRANT SELECT ON public.health_data_public TO anon, authenticated;
