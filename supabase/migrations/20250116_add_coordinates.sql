-- Add coordinates to properties table
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS latitude NUMERIC,
ADD COLUMN IF NOT EXISTS longitude NUMERIC;

-- Create an index for geospatial queries (optional but good for future)
CREATE INDEX IF NOT EXISTS properties_latitude_longitude_idx ON properties (latitude, longitude);
