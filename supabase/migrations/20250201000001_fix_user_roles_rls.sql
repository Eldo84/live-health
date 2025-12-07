-- Fix RLS policy circular dependency issue
-- The "Admins can view all roles" policy causes a 500 error due to circular dependency

-- Drop the problematic policy
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;

-- The "Users can view own role" policy is sufficient for users to check their own role
-- Admins can still view all roles through the is_admin() function or by checking individual user_ids

-- Note: If you need admins to view all roles via direct query, you can add a policy that uses
-- the is_admin() function, but for now, the direct user check is sufficient.

