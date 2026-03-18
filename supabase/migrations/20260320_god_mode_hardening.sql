-- God Mode Platform Hardening
-- This migration addresses security gaps, data integrity issues, and role-based access control (RBAC).

-- 1. [Security] Profile Role & Status Protection
-- Prevent users from self-elevating roles or verifying their own KYC status.

-- First, drop the broad existing update policy
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;

-- Create a restrictive update policy: Users can only update non-sensitive info
CREATE POLICY "Users can update their own non-sensitive profile info"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND 
  -- Ensure sensitive columns are NOT changed
  (roles IS NOT DISTINCT FROM (SELECT roles FROM public.profiles WHERE id = auth.uid())) AND
  (primary_role IS NOT DISTINCT FROM (SELECT primary_role FROM public.profiles WHERE id = auth.uid())) AND
  (kyc_status IS NOT DISTINCT FROM (SELECT kyc_status FROM public.profiles WHERE id = auth.uid())) AND
  (trust_score IS NOT DISTINCT FROM (SELECT trust_score FROM public.profiles WHERE id = auth.uid())) AND
  (is_blocked IS NOT DISTINCT FROM (SELECT is_blocked FROM public.profiles WHERE id = auth.uid()))
);

-- Trigger to double-enforce role protection (for server-side/direct updates)
CREATE OR REPLACE FUNCTION public.protect_user_roles_integrity()
RETURNS TRIGGER AS $$
BEGIN
    -- Only allow admins or superusers to change these specific columns
    -- In Supabase, service_role bypasses this, but we protect against standard auth users
    IF (auth.role() = 'authenticated') THEN
        IF (OLD.roles IS DISTINCT FROM NEW.roles OR 
            OLD.primary_role IS DISTINCT FROM NEW.primary_role OR
            OLD.kyc_status IS DISTINCT FROM NEW.kyc_status OR
            OLD.is_blocked IS DISTINCT FROM NEW.is_blocked) THEN
            RAISE EXCEPTION 'Security Violation: Unauthorized role or status modification attempt.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_protect_user_roles
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_user_roles_integrity();


-- 2. [Data Integrity] Property Validation Hardening
-- Enforce strict constraints on pricing, coordinates, and status.

-- Ensure price is valid
ALTER TABLE public.properties
ADD CONSTRAINT property_price_positive CHECK (price > 0);

-- Ensure coordinates are valid and not zero (Category 3 & 5)
ALTER TABLE public.properties
ADD CONSTRAINT property_coords_valid CHECK (
    latitude BETWEEN -90 AND 90 AND 
    longitude BETWEEN -180 AND 180 AND
    (latitude != 0 OR longitude != 0) -- Skip exact 0,0 which is usually a bug
);

-- 3. [Logic Consistency] Sync Status and Availability
-- Prevent "Ghost Listings" (Category 13)
CREATE OR REPLACE FUNCTION public.sync_property_availability()
RETURNS TRIGGER AS $$
BEGIN
    -- If status changes to anything other than 'active', mark as unavailable
    IF NEW.status != 'active' THEN
        NEW.is_available := false;
    END IF;
    
    -- If someone tries to set is_available = true but status is archived/pending
    IF NEW.is_available = true AND NEW.status != 'active' THEN
        NEW.is_available := false;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_property_availability
BEFORE INSERT OR UPDATE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.sync_property_availability();


-- 4. [API Security] Payment & Chat RLS Hardening
-- Ensure users can't tamper with IDs to see others' data (Category 10).

-- Payments RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
CREATE POLICY "Users can view their own payments"
ON public.payments FOR SELECT
USING (auth.uid() = userid); -- Match original column name from 20260315_create_payments_table.sql


-- Chat RLS cleanup (ensuring strict room ownership)
DROP POLICY IF EXISTS "Participants can view their rooms" ON public.chat_rooms;
CREATE POLICY "Participants can view their rooms"
ON public.chat_rooms FOR SELECT
USING (auth.uid() IN (tenant_id, owner_id));

COMMENT ON DATABASE postgres IS 'God Mode Hardening: RBAC Locked, Data Constraints Enforced, API Security Hardened.';
