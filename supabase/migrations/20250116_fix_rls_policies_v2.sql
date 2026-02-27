-- Fix RLS policies for society tables and storage

-- 1. Helper function to check if user is society admin
CREATE OR REPLACE FUNCTION public.is_society_admin(lookup_society_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.societies
    WHERE id = lookup_society_id
    AND admin_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Society Members Policies

-- Allow society admins to update members (e.g. approve/reject)
CREATE POLICY "Society admins can update members"
ON public.society_members
FOR UPDATE
USING (public.is_society_admin(society_id));

-- Allow society admins to delete members
CREATE POLICY "Society admins can delete members"
ON public.society_members
FOR DELETE
USING (public.is_society_admin(society_id));

-- Allow users to leave society (delete their own record)
CREATE POLICY "Users can leave society"
ON public.society_members
FOR DELETE
USING (user_id = auth.uid());

-- Allow admins to add members manually
CREATE POLICY "Society admins can add members"
ON public.society_members
FOR INSERT
WITH CHECK (public.is_society_admin(society_id));


-- 3. Maintenance Records Policies

-- Allow society admins to create maintenance records
CREATE POLICY "Society admins can create maintenance records"
ON public.maintenance_records
FOR INSERT
WITH CHECK (public.is_society_admin(society_id));

-- Allow society admins to update maintenance records
CREATE POLICY "Society admins can update maintenance records"
ON public.maintenance_records
FOR UPDATE
USING (public.is_society_admin(society_id));

-- Allow society admins to delete maintenance records
CREATE POLICY "Society admins can delete maintenance records"
ON public.maintenance_records
FOR DELETE
USING (public.is_society_admin(society_id));


-- 4. Notices Policies

-- Allow society admins to create notices
CREATE POLICY "Society admins can create notices"
ON public.notices
FOR INSERT
WITH CHECK (public.is_society_admin(society_id));

-- Allow society admins to update/delete notices
CREATE POLICY "Society admins can update notices"
ON public.notices
FOR UPDATE
USING (public.is_society_admin(society_id));

CREATE POLICY "Society admins can delete notices"
ON public.notices
FOR DELETE
USING (public.is_society_admin(society_id));


-- 5. Storage Policies (Fix "new row violates..." for uploads)

-- Drop overly restrictive property image policy if exists
DROP POLICY IF EXISTS "Users can upload property images" ON storage.objects;

-- Create more permissive policy for property images
CREATE POLICY "Authenticated users can upload property images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'property-images' 
  AND auth.role() = 'authenticated'
);

-- Drop overly restrictive avatar policy if exists
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;

-- Create more permissive policy for avatars
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);

-- Ensure public access to property images (fix potential select issues)
DROP POLICY IF EXISTS "Property images are publicly accessible" ON storage.objects;
CREATE POLICY "Property images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-images');

-- Ensure public access to avatars
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');
