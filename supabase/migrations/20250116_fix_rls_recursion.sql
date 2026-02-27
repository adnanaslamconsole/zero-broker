-- Fix infinite recursion in society_members RLS policy

-- 1. Create a secure function to get user's societies
-- SECURITY DEFINER means it runs with owner permissions, bypassing RLS
CREATE OR REPLACE FUNCTION get_auth_user_society_ids()
RETURNS TABLE (society_id UUID) 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public
AS $$
  SELECT society_id FROM society_members WHERE user_id = auth.uid();
$$;

-- 2. Drop the recursive policy
DROP POLICY IF EXISTS "Members viewable by society members" ON society_members;

-- 3. Create new non-recursive policy
CREATE POLICY "Members viewable by society members" ON society_members
FOR SELECT
USING (
  society_id IN ( SELECT get_auth_user_society_ids() )
);
