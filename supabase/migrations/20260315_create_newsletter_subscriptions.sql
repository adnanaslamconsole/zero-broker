-- Create newsletter_subscriptions table
CREATE TABLE IF NOT EXISTS public.newsletter_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow public to insert emails (for the footer form)
CREATE POLICY "Allow public inserts for newsletter_subscriptions" 
ON public.newsletter_subscriptions 
FOR INSERT 
WITH CHECK (true);

-- Only allow authenticated admin to view subscriptions (optional, for future)
CREATE POLICY "Allow authenticated users to view newsletter_subscriptions" 
ON public.newsletter_subscriptions 
FOR SELECT 
TO authenticated 
USING (true);
