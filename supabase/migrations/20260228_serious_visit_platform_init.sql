-- Enable PostGIS if not already enabled (for future geospatial features)
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Update profiles table with verification fields and trust score
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS pan_number TEXT,
ADD COLUMN IF NOT EXISTS aadhaar_number_masked TEXT,
ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'unverified' CHECK (kyc_status IN ('unverified', 'pending', 'verified', 'rejected')),
ADD COLUMN IF NOT EXISTS kyc_rejection_reason TEXT;

-- 2. Create kyc_documents table for storing document references
CREATE TABLE IF NOT EXISTS public.kyc_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (document_type IN ('pan', 'aadhaar', 'selfie', 'property_doc', 'electricity_bill')),
    file_path TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create visit_bookings table
CREATE TABLE IF NOT EXISTS public.visit_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    visit_date DATE NOT NULL,
    visit_time TEXT NOT NULL, -- e.g., '10:00-12:00'
    payment_id TEXT, -- Razorpay payment ID
    booking_status TEXT DEFAULT 'pending' CHECK (booking_status IN ('pending', 'confirmed', 'completed', 'no_show_tenant', 'no_show_owner', 'cancelled')),
    otp_code TEXT,
    refund_status TEXT DEFAULT 'none' CHECK (refund_status IN ('none', 'pending', 'completed', 'failed', 'converted_to_credit')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create owner_availability table for defining slots
CREATE TABLE IF NOT EXISTS public.owner_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    available_day INTEGER NOT NULL CHECK (available_day BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    UNIQUE(property_id, available_day, start_time, end_time)
);

-- 5. Create storage buckets for KYC and Property documents
-- Note: These usually need to be created via the Supabase Dashboard or CLI, but adding as comments for reference
-- INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-documents', 'kyc-documents', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('property-verification', 'property-verification', false);

-- Enable RLS for new tables
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_availability ENABLE ROW LEVEL SECURITY;

-- RLS Policies for kyc_documents
CREATE POLICY "Users can view their own KYC documents" ON public.kyc_documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can upload their own KYC documents" ON public.kyc_documents FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for visit_bookings
CREATE POLICY "Users can view their own bookings" ON public.visit_bookings FOR SELECT USING (auth.uid() = tenant_id OR auth.uid() = owner_id);
CREATE POLICY "Tenants can create bookings" ON public.visit_bookings FOR INSERT WITH CHECK (auth.uid() = tenant_id);
CREATE POLICY "Users can update their own bookings" ON public.visit_bookings FOR UPDATE USING (auth.uid() = tenant_id OR auth.uid() = owner_id);

-- RLS Policies for owner_availability
CREATE POLICY "Anyone can view availability" ON public.owner_availability FOR SELECT USING (true);
CREATE POLICY "Owners can manage their own availability" ON public.owner_availability FOR ALL USING (auth.uid() = owner_id);
