-- Add slug column to services table (without unique constraint first to allow updates)
ALTER TABLE services ADD COLUMN IF NOT EXISTS slug TEXT;

-- Update existing services with a slug based on their name
-- We use a CTE to ensure we handle duplicates if they exist in names
WITH slugified AS (
  SELECT id, lower(replace(name, ' ', '-')) as generated_slug
  FROM services
)
UPDATE services 
SET slug = s.generated_slug
FROM slugified s
WHERE services.id = s.id AND services.slug IS NULL;

-- Handle potential duplicates by appending ID suffix if necessary (unlikely but safe)
UPDATE services s1
SET slug = s1.slug || '-' || substring(s1.id::text, 1, 4)
FROM services s2
WHERE s1.slug = s2.slug AND s1.id <> s2.id;

-- Now add the unique constraint
ALTER TABLE services ADD CONSTRAINT services_slug_key UNIQUE (slug);

-- Add rental-agreement service if it doesn't exist
INSERT INTO services (name, slug, category, description, base_price, price_unit, image_url, features)
SELECT 
  'Rental Agreement', 
  'rental-agreement', 
  'legal', 
  'E-stamped rental agreements delivered to your doorstep. Fully legal and valid.', 
  499, 
  'fixed', 
  'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800', 
  ARRAY['E-stamping included', 'Doorstep delivery', 'Digital signature', 'Legal consultation']
WHERE NOT EXISTS (SELECT 1 FROM services WHERE slug = 'rental-agreement');
