-- Ensure slug column exists
ALTER TABLE services ADD COLUMN IF NOT EXISTS slug TEXT;

-- Clear existing slugs to avoid conflicts during the update process
UPDATE services SET slug = NULL;

-- Update existing services with a cleaner, unique slug based on their name
WITH base_slugs AS (
  SELECT id, 
    lower(
      trim(
        regexp_replace(
          regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'),
          '^-|-$', '', 'g'
        )
      )
    ) as raw_slug
  FROM services
),
ranked_slugs AS (
  SELECT id, raw_slug,
    ROW_NUMBER() OVER (PARTITION BY raw_slug ORDER BY id) as rn
  FROM base_slugs
)
UPDATE services 
SET slug = CASE 
  WHEN rs.rn = 1 THEN rs.raw_slug 
  ELSE rs.raw_slug || '-' || rs.rn 
END
FROM ranked_slugs rs
WHERE services.id = rs.id;

-- Drop existing constraint if it exists (for idempotency)
ALTER TABLE services DROP CONSTRAINT IF EXISTS services_slug_key;

-- Now add the unique constraint safely
ALTER TABLE services ADD CONSTRAINT services_slug_key UNIQUE (slug);

-- Add rental-agreement service if it doesn't exist
DO $$ 
BEGIN
    INSERT INTO services (name, slug, category, description, base_price, pricing_model, image_url, features)
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
EXCEPTION WHEN undefined_column THEN
    -- Fallback to price_unit if pricing_model doesn't exist yet
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
END $$;
