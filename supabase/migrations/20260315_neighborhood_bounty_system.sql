-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create verification status enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status_enum') THEN
    CREATE TYPE verification_status_enum AS ENUM ('pending', 'community_vouched', 'audit_failed');
  END IF;
END $$;

-- Extend properties table
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT, 4326),
ADD COLUMN IF NOT EXISTS trust_score FLOAT DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS bounty_verification_status verification_status_enum DEFAULT 'pending';

-- Trigger to sync location from latitude/longitude
CREATE OR REPLACE FUNCTION sync_property_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location := ST_SetSRID(ST_Point(NEW.longitude, NEW.latitude), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_property_location ON properties;
CREATE TRIGGER trg_sync_property_location
BEFORE INSERT OR UPDATE OF latitude, longitude ON properties
FOR EACH ROW EXECUTE FUNCTION sync_property_location();

-- Sync existing data
UPDATE properties 
SET location = ST_SetSRID(ST_Point(longitude, latitude), 4326)::geography 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND location IS NULL;

-- Create verification_bounties table
CREATE TABLE IF NOT EXISTS verification_bounties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  reward_amount NUMERIC NOT NULL DEFAULT 50.0,
  status TEXT DEFAULT 'active', -- active, claimed, paid, expired
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '48 hours')
);

-- Create verification_submissions table
CREATE TABLE IF NOT EXISTS verification_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bounty_id UUID REFERENCES verification_bounties(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  video_url TEXT NOT NULL,
  gps_accuracy FLOAT NOT NULL,
  is_spoofed BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb, -- Store C2PA metadata strings
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE verification_bounties ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_submissions ENABLE ROW LEVEL SECURITY;

-- Policies for verification_bounties
CREATE POLICY "Anyone can view active bounties"
ON verification_bounties FOR SELECT
USING (status = 'active');

-- Policies for verification_submissions
CREATE POLICY "Users can view their own submissions"
ON verification_submissions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own submissions"
ON verification_submissions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Proximity function
CREATE OR REPLACE FUNCTION verify_proximity(
  p_property_id UUID,
  p_user_lat DOUBLE PRECISION,
  p_user_lon DOUBLE PRECISION,
  p_radius_meters FLOAT DEFAULT 50.0
)
RETURNS BOOLEAN AS $$
DECLARE
  prop_loc GEOGRAPHY;
  user_loc GEOGRAPHY;
BEGIN
  SELECT location INTO prop_loc FROM properties WHERE id = p_property_id;
  user_loc := ST_SetSRID(ST_Point(p_user_lon, p_user_lat), 4326)::geography;
  
  RETURN ST_DWithin(prop_loc, user_loc, p_radius_meters);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
