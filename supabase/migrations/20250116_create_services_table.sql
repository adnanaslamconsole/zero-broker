-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'packers-movers', 'cleaning', 'painting', etc.
  description TEXT NOT NULL,
  base_price NUMERIC NOT NULL,
  price_unit TEXT, -- 'per BHK', 'per sqft', 'fixed'
  image_url TEXT,
  features TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS service_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  service_id UUID REFERENCES services(id) NOT NULL,
  booking_date DATE NOT NULL,
  booking_time TEXT NOT NULL, -- 'Morning', 'Afternoon', 'Evening' or specific time
  status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'completed', 'cancelled'
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  notes TEXT,
  total_amount NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_bookings ENABLE ROW LEVEL SECURITY;

-- Policies for services
CREATE POLICY "Public services are viewable by everyone" 
ON services FOR SELECT 
USING (true);

-- Policies for bookings
CREATE POLICY "Users can view their own bookings" 
ON service_bookings FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create bookings" 
ON service_bookings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings" 
ON service_bookings FOR UPDATE 
USING (auth.uid() = user_id);

-- Seed Data
INSERT INTO services (name, category, description, base_price, price_unit, image_url, features) VALUES
(
  'Premium Home Painting',
  'painting',
  'Professional home painting with premium emulsion paints. Includes masking, sanding, and post-painting cleanup.',
  12000,
  'starts from',
  'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800',
  ARRAY['Dust-free sanding', 'Premium Paint', 'Furniture covering', 'Post-cleanup']
),
(
  'Deep Home Cleaning',
  'cleaning',
  'Complete deep cleaning of your home including bathroom, kitchen, and living areas.',
  3999,
  'per 2BHK',
  'https://images.unsplash.com/photo-1646980241033-cd7abda2ee88?w=800',
  ARRAY['Floor scrubbing', 'Toilet sanitization', 'Kitchen degreasing', 'Window cleaning']
),
(
  'Packers & Movers',
  'packers-movers',
  'Hassle-free relocation service with high-quality packaging materials and safe transportation.',
  5000,
  'starts from',
  'https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=800',
  ARRAY['3-layer packing', 'Safe transportation', 'Loading & Unloading', 'Insurance coverage']
),
(
  'Bathroom Cleaning',
  'cleaning',
  'Intensive cleaning and sanitization of bathrooms.',
  499,
  'per bathroom',
  'https://plus.unsplash.com/premium_photo-1664372899354-99e6d9f50f58?w=800',
  ARRAY['Tile scrubbing', 'Tap polishing', 'Mirror cleaning', 'Sanitization']
),
(
  'Sofa Cleaning',
  'cleaning',
  'Shampooing and deep vacuuming of sofas.',
  249,
  'per seat',
  'https://images.unsplash.com/photo-1540574163026-643ea20ade25?w=800',
  ARRAY['Dust removal', 'Shampoo wash', 'Stain removal', 'Vacuum drying']
);
