-- Add Services
INSERT INTO public.services (
  name, category, description, base_price, price_unit, image_url, features
) VALUES

-- Cleaning
('Deep Home Cleaning', 'cleaning', 'Complete deep cleaning of your home including kitchen and bathrooms.', 2999, 'service', 'https://images.unsplash.com/photo-1581578731117-104f2a863727?w=800&q=80', ARRAY['Floor Scrubbing', 'Bathroom Deep Clean', 'Kitchen Degreasing', 'Window Cleaning']),
('Sofa Cleaning', 'cleaning', 'Professional shampooing and vacuuming of sofas.', 499, 'seat', 'https://images.unsplash.com/photo-1632935187086-53a81e71e220?w=800&q=80', ARRAY['Shampooing', 'Vacuuming', 'Stain Removal']),

-- Plumbing
('General Plumbing', 'plumbing', 'Fixing leaks, taps, and other general plumbing issues.', 299, 'visit', 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&q=80', ARRAY['Inspection', 'Minor Fixes', 'Consultation']),
('Water Tank Cleaning', 'plumbing', 'Mechanized cleaning of overhead and underground water tanks.', 999, 'tank', 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=800&q=80', ARRAY['Sludge Removal', 'High Pressure Cleaning', 'Disinfection']),

-- Electrical
('Electrician Visit', 'electrical', 'Diagnosis and repair of electrical faults.', 249, 'visit', 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=80', ARRAY['Fault Diagnosis', 'Switch Replacement', 'Fan Installation']),
('Inverter Installation', 'electrical', 'Installation of inverter and battery setup.', 599, 'unit', 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80', ARRAY['Wiring', 'Mounting', 'Testing']),

-- Painting
('House Painting', 'painting', 'Professional wall painting services.', 12, 'sq.ft', 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800&q=80', ARRAY['Wall Putty', 'Primer', '2 Coats of Paint']),

-- Pest Control
('General Pest Control', 'pest-control', 'Treatment for cockroaches, ants, and other common pests.', 899, 'service', 'https://images.unsplash.com/photo-1622359283777-66a908298755?w=800&q=80', ARRAY['Gel Baiting', 'Spray Treatment', '3 Months Warranty']);

-- Add ZeroBrokerHood Societies (Sample Data)
-- Note: Real societies are created by users via the app
INSERT INTO public.societies (
  name, city, locality, address, total_flats, admin_id
) VALUES 
('Prestige Shantiniketan', 'Bengaluru', 'Whitefield', 'Whitefield Main Road, Bengaluru', 3000, '00000000-0000-0000-0000-000000000000'),
('My Home Avatar', 'Hyderabad', 'Gachibowli', 'Narsingi, Hyderabad', 2500, '00000000-0000-0000-0000-000000000000')
ON CONFLICT DO NOTHING;
