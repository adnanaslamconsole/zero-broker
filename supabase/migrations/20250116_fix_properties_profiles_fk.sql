-- Fix PostgREST relationship detection between properties and profiles
-- This allows queries like: select=*,profiles(*)

-- Add explicit foreign key from properties.owner_id to profiles.id
-- Note: properties.owner_id already references auth.users(id), but adding this
-- second FK allows PostgREST to "see" the relationship to the public.profiles table.

ALTER TABLE public.properties
DROP CONSTRAINT IF EXISTS properties_owner_id_fkey_profiles;

ALTER TABLE public.properties
ADD CONSTRAINT properties_owner_id_fkey_profiles
FOREIGN KEY (owner_id)
REFERENCES public.profiles (id)
ON DELETE CASCADE; -- If profile is deleted, delete property (optional, but safe since profile deletion usually implies user deletion)
