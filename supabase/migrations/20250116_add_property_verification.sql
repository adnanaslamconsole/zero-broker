-- Add verification fields to properties
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending'; -- pending, approved, rejected

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_properties_verification ON properties(verification_status);

-- Policy for Admins to update properties
CREATE POLICY "Admins can update any property"
ON properties FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'platform-admin' = ANY(roles)
  )
);

-- Policy for Admins to delete properties
CREATE POLICY "Admins can delete any property"
ON properties FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'platform-admin' = ANY(roles)
  )
);

-- Policy for Admins to update profiles (e.g. block users)
CREATE POLICY "Admins can update any profile"
ON profiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'platform-admin' = ANY(roles)
  )
);
