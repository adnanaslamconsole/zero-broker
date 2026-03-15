-- Create payments table to support booking system
CREATE TABLE IF NOT EXISTS public.payments (
    id TEXT PRIMARY KEY,
    userId UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ownerId UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    method TEXT NOT NULL,
    status TEXT NOT NULL,
    purpose TEXT NOT NULL,
    referenceId TEXT UNIQUE NOT NULL,
    gateway TEXT NOT NULL,
    gatewayTransactionId TEXT UNIQUE,
    escrowStatus TEXT CHECK (escrowStatus IN ('held', 'released', 'refunded')),
    escrowDetails JSONB,
    auditTrail JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own payments" 
ON public.payments 
FOR SELECT 
USING (auth.uid() = userId OR auth.uid() = ownerId);

CREATE POLICY "Tenants can insert payment records" 
ON public.payments 
FOR INSERT 
WITH CHECK (auth.uid() = userId);
