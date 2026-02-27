-- MUMBAI PROPERTIES
INSERT INTO public.properties (
  owner_id, title, description, type, property_category, 
  price, city, locality, address, 
  bedrooms, bathrooms, area, furnishing_status, 
  amenities, images, 
  latitude, longitude, 
  verification_status, is_verified, is_available
) VALUES

-- Andheri
('00000000-0000-0000-0000-000000000000', '2BHK in Andheri West', 'Premium apartment near Lokhandwala Market.', 'rent', 'apartment', 55000, 'Mumbai', 'Andheri', 'Lokhandwala Complex', 2, 2, 1100, 'furnished', ARRAY['Parking', 'Lift', 'Security'], ARRAY['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80'], 19.1363, 72.8277, 'verified', true, true),

-- Bandra
('00000000-0000-0000-0000-000000000000', 'Sea View Flat in Bandra West', 'Luxury 3BHK on Carter Road.', 'sale', 'apartment', 65000000, 'Mumbai', 'Bandra', 'Carter Road', 3, 3, 1600, 'semi-furnished', ARRAY['Sea View', 'Gym', 'Parking'], ARRAY['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80'], 19.0600, 72.8200, 'verified', true, true),

-- Borivali
('00000000-0000-0000-0000-000000000000', '1BHK in Borivali West', 'Near Station, IC Colony.', 'rent', 'apartment', 25000, 'Mumbai', 'Borivali', 'IC Colony', 1, 1, 600, 'unfurnished', ARRAY['Water Supply', 'Lift'], ARRAY['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80'], 19.2460, 72.8500, 'verified', true, true),

-- Dadar
('00000000-0000-0000-0000-000000000000', '2BHK in Dadar West', 'Near Shivaji Park, quiet locality.', 'sale', 'apartment', 35000000, 'Mumbai', 'Dadar', 'Shivaji Park', 2, 2, 900, 'semi-furnished', ARRAY['Park', 'Security'], ARRAY['https://images.unsplash.com/photo-1484154218962-a1c002085d2f?w=800&q=80'], 19.0269, 72.8350, 'verified', true, true),

-- Colaba
('00000000-0000-0000-0000-000000000000', 'Heritage Apartment in Colaba', 'Spacious flat in art deco building.', 'rent', 'apartment', 120000, 'Mumbai', 'Colaba', 'Near Gateway', 3, 3, 1800, 'furnished', ARRAY['High Ceiling', 'Security'], ARRAY['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80'], 18.9220, 72.8347, 'verified', true, true),

-- Kurla
('00000000-0000-0000-0000-000000000000', 'Commercial Office in Kurla', 'Near BKC Junction.', 'rent', 'office', 45000, 'Mumbai', 'Kurla', 'LBS Marg', 0, 1, 500, 'furnished', ARRAY['AC', 'Lift'], ARRAY['https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80'], 19.0700, 72.8700, 'verified', true, true),

-- Malad
('00000000-0000-0000-0000-000000000000', '2BHK in Malad West', 'Near Inorbit Mall.', 'sale', 'apartment', 18000000, 'Mumbai', 'Malad', 'Link Road', 2, 2, 1000, 'semi-furnished', ARRAY['Mall', 'Gym', 'Pool'], ARRAY['https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=800&q=80'], 19.1860, 72.8350, 'verified', true, true),

-- Powai
('00000000-0000-0000-0000-000000000000', 'Lake View Flat in Powai', 'Hiranandani Gardens, premium lifestyle.', 'rent', 'apartment', 75000, 'Mumbai', 'Powai', 'Hiranandani Gardens', 2, 2, 1100, 'furnished', ARRAY['Lake View', 'Club House', 'Gym'], ARRAY['https://images.unsplash.com/photo-1600596542815-2250c385e381?w=800&q=80'], 19.1176, 72.9060, 'verified', true, true),

-- Vile Parle
('00000000-0000-0000-0000-000000000000', '3BHK in Vile Parle East', 'Near Airport, peaceful area.', 'sale', 'apartment', 42000000, 'Mumbai', 'Vile Parle', 'Hanuman Road', 3, 3, 1400, 'semi-furnished', ARRAY['Parking', 'Security'], ARRAY['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80'], 19.1000, 72.8500, 'verified', true, true),

-- Goregaon
('00000000-0000-0000-0000-000000000000', '1BHK in Goregaon East', 'Near Oberoi Mall.', 'rent', 'apartment', 32000, 'Mumbai', 'Goregaon', 'Gokuldham', 1, 1, 550, 'semi-furnished', ARRAY['Park', 'Lift'], ARRAY['https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80'], 19.1663, 72.8593, 'verified', true, true);
