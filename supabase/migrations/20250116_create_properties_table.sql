-- Create properties table
CREATE TABLE IF NOT EXISTS properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- 'rent', 'sale', 'pg', 'commercial'
  property_category TEXT NOT NULL, -- 'apartment', 'villa', 'plot', etc.
  price NUMERIC NOT NULL,
  city TEXT NOT NULL,
  locality TEXT NOT NULL,
  address TEXT,
  bedrooms INTEGER,
  bathrooms INTEGER,
  area INTEGER, -- in sq ft
  furnishing_status TEXT, -- 'furnished', 'semi-furnished', 'unfurnished'
  amenities TEXT[],
  images TEXT[],
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Policies
-- Everyone can view available properties
CREATE POLICY "Public properties are viewable by everyone" 
ON properties FOR SELECT 
USING (true);

-- Users can insert their own properties
CREATE POLICY "Users can insert their own properties" 
ON properties FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

-- Users can update their own properties
CREATE POLICY "Users can update their own properties" 
ON properties FOR UPDATE 
USING (auth.uid() = owner_id);

-- Users can delete their own properties
CREATE POLICY "Users can delete their own properties" 
ON properties FOR DELETE 
USING (auth.uid() = owner_id);

-- Create storage bucket for property images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('property-images', 'property-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Property images are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'property-images');

CREATE POLICY "Users can upload property images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'property-images' AND auth.uid() = owner);

CREATE POLICY "Users can update their property images" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'property-images' AND auth.uid() = owner);

CREATE POLICY "Users can delete their property images" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'property-images' AND auth.uid() = owner);
