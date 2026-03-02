-- Migration to expand Service Marketplace Schema
-- This script adds missing service categories, providers, availability, and advanced searching capabilities.

-- 1. Create Service Categories Table (if more structure is needed beyond a string)
CREATE TABLE IF NOT EXISTS public.service_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    icon_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Service Providers Table
CREATE TABLE IF NOT EXISTS public.service_providers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    description TEXT,
    rating NUMERIC DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    contact_email TEXT,
    contact_phone TEXT,
    profile_image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Update Services Table to include Category Relationship and Provider
-- We'll add columns to the existing services table
DO $$ 
BEGIN
    -- Rename price_unit to pricing_model if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'price_unit') THEN
        ALTER TABLE public.services RENAME COLUMN price_unit TO pricing_model;
    END IF;

    -- Make category column nullable if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'category') THEN
        ALTER TABLE public.services ALTER COLUMN category DROP NOT NULL;
    END IF;
END $$;

ALTER TABLE public.services ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.service_categories(id);
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES public.service_providers(id);
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS estimated_duration TEXT; -- e.g., '2-3 hours'
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS required_skills TEXT[];
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS min_price NUMERIC;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS max_price NUMERIC;

-- 4. Service Locations Table (Geographic Availability)
CREATE TABLE IF NOT EXISTS public.service_locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
    city TEXT NOT NULL,
    area TEXT,
    pincode TEXT,
    is_available BOOLEAN DEFAULT true,
    UNIQUE(service_id, city, area)
);

-- 5. Service Availability Table (Time slots/Days)
CREATE TABLE IF NOT EXISTS public.service_availability (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    provider_id UUID REFERENCES public.service_providers(id) ON DELETE CASCADE,
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT true
);

-- 6. Indices for Performance
CREATE INDEX IF NOT EXISTS idx_services_category_id ON public.services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_provider_id ON public.services(provider_id);
CREATE INDEX IF NOT EXISTS idx_service_locations_city ON public.service_locations(city);
CREATE INDEX IF NOT EXISTS idx_service_locations_service_id ON public.service_locations(service_id);
CREATE INDEX IF NOT EXISTS idx_service_availability_provider_id ON public.service_availability(provider_id);

-- 7. Enable RLS
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_availability ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies
DROP POLICY IF EXISTS "Categories are public" ON public.service_categories;
CREATE POLICY "Categories are public" ON public.service_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Providers are public" ON public.service_providers;
CREATE POLICY "Providers are public" ON public.service_providers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Locations are public" ON public.service_locations;
CREATE POLICY "Locations are public" ON public.service_locations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Availability is public" ON public.service_availability;
CREATE POLICY "Availability is public" ON public.service_availability FOR SELECT USING (true);

-- 9. Stored Procedure for Searching Services
CREATE OR REPLACE FUNCTION search_services(
    p_city TEXT DEFAULT NULL,
    p_category_slug TEXT DEFAULT NULL,
    p_min_price NUMERIC DEFAULT NULL,
    p_max_price NUMERIC DEFAULT NULL
)
RETURNS TABLE (
    service_id UUID,
    service_name TEXT,
    category_name TEXT,
    provider_name TEXT,
    base_price NUMERIC,
    city TEXT,
    rating NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id as service_id,
        s.name as service_name,
        sc.name as category_name,
        sp.business_name as provider_name,
        s.base_price,
        sl.city,
        sp.rating
    FROM 
        public.services s
    JOIN 
        public.service_categories sc ON s.category_id = sc.id
    JOIN 
        public.service_providers sp ON s.provider_id = sp.id
    JOIN 
        public.service_locations sl ON s.id = sl.service_id
    WHERE 
        (p_city IS NULL OR sl.city = p_city)
        AND (p_category_slug IS NULL OR sc.slug = p_category_slug)
        AND (p_min_price IS NULL OR s.base_price >= p_min_price)
        AND (p_max_price IS NULL OR s.base_price <= p_max_price)
        AND sl.is_available = true;
END;
$$ LANGUAGE plpgsql;

-- 10. Seed Initial Categories
INSERT INTO public.service_categories (name, slug, description) VALUES
('Packers & Movers', 'packers-movers', 'Professional relocation and moving services'),
('Home Cleaning', 'home-cleaning', 'Deep cleaning, sofa cleaning, and bathroom sanitization'),
('Plumbing', 'plumbing', 'Pipe repairs, leak fixes, and installation'),
('Electrical Work', 'electrical-work', 'Wiring, switchboard repair, and appliance setup'),
('Carpentry', 'carpentry', 'Furniture repair, assembly, and custom woodwork'),
('Pest Control', 'pest-control', 'General pest control and termite treatment'),
('Beauty Services', 'beauty', 'Salon at home, makeup, and spa treatments'),
('Appliance Repair', 'appliance-repair', 'AC, Refrigerator, and Washing Machine repair'),
('Tutoring', 'tutoring', 'Academic and skill-based learning'),
('Event Planning', 'event-planning', 'Wedding, birthday, and corporate event management'),
('Pet Care', 'pet-care', 'Grooming, walking, and boarding for pets')
ON CONFLICT (name) DO UPDATE SET 
    slug = EXCLUDED.slug,
    description = EXCLUDED.description;

-- 11. Seed Sample Provider
DO $$
DECLARE
    v_category_id UUID;
    v_provider_id UUID;
    v_service_id UUID;
BEGIN
    -- Create a sample provider (using a dummy UUID for user_id or NULL)
    INSERT INTO public.service_providers (business_name, description, rating, review_count, is_verified)
    VALUES ('ZeroBroker Elite Services', 'Top-rated professional services for your home', 4.8, 120, true)
    RETURNING id INTO v_provider_id;

    -- Map existing services to categories and providers
    -- 1. Cleaning
    SELECT id INTO v_category_id FROM public.service_categories WHERE slug = 'home-cleaning';
    UPDATE public.services SET category_id = v_category_id, provider_id = v_provider_id, estimated_duration = '4-6 hours', required_skills = ARRAY['Deep Cleaning', 'Sanitization']
    WHERE category = 'cleaning' OR category = 'home-cleaning';

    -- 2. Packers & Movers
    SELECT id INTO v_category_id FROM public.service_categories WHERE slug = 'packers-movers';
    UPDATE public.services SET category_id = v_category_id, provider_id = v_provider_id, estimated_duration = '1-2 days', required_skills = ARRAY['Heavy Lifting', 'Packing', 'Logistics']
    WHERE category = 'packers-movers';

    -- Add new specific services for other categories
    -- Plumbing
    SELECT id INTO v_category_id FROM public.service_categories WHERE slug = 'plumbing';
    INSERT INTO public.services (name, category, category_id, provider_id, description, base_price, pricing_model, estimated_duration, features)
    VALUES ('General Plumbing Repair', 'plumbing', v_category_id, v_provider_id, 'Fix leaks, taps, and minor pipe issues', 499, 'per visit', '1-2 hours', ARRAY['Leak detection', 'Spare parts replacement', 'Post-service cleanup'])
    RETURNING id INTO v_service_id;

    INSERT INTO public.service_locations (service_id, city, area) VALUES (v_service_id, 'Mumbai', 'Andheri'), (v_service_id, 'Bangalore', 'Indiranagar');

    -- Electrical
    SELECT id INTO v_category_id FROM public.service_categories WHERE slug = 'electrical-work';
    INSERT INTO public.services (name, category, category_id, provider_id, description, base_price, pricing_model, estimated_duration, features)
    VALUES ('Fan/Light Installation', 'electrical-work', v_category_id, v_provider_id, 'Professional installation of ceiling fans and light fixtures', 299, 'per item', '30-60 mins', ARRAY['Safety check', 'Wiring inspection'])
    RETURNING id INTO v_service_id;

    INSERT INTO public.service_locations (service_id, city, area) VALUES (v_service_id, 'Mumbai', 'Bandra'), (v_service_id, 'Bangalore', 'Whitefield');

    -- Pet Care
    SELECT id INTO v_category_id FROM public.service_categories WHERE slug = 'pet-care';
    INSERT INTO public.services (name, category, category_id, provider_id, description, base_price, pricing_model, estimated_duration, features)
    VALUES ('Pet Grooming at Home', 'pet-care', v_category_id, v_provider_id, 'Full grooming session for your pets in the comfort of your home', 1499, 'per session', '2 hours', ARRAY['Bathing', 'Hair trim', 'Nail clipping'])
    RETURNING id INTO v_service_id;

    INSERT INTO public.service_locations (service_id, city, area) VALUES (v_service_id, 'Mumbai', 'Powai'), (v_service_id, 'Bangalore', 'Koramangala');

END $$;
