-- Create user_leads table for the automated chat assistant
CREATE TABLE IF NOT EXISTS public.user_leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    property_type TEXT NOT NULL,
    location TEXT NOT NULL,
    transaction_intent TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    status TEXT DEFAULT 'pending'::text NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable Row Level Security
ALTER TABLE public.user_leads ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own leads (even if not logged in, but we handle that in the UI)
-- For public leads, we might need a more permissive policy or handle it via a service role
-- but here we assume the user might be logged in or anonymous.
CREATE POLICY "Users can insert their own leads" 
ON public.user_leads 
FOR INSERT 
WITH CHECK (true);

-- Allow admins or the user themselves to view their leads
CREATE POLICY "Users can view their own leads" 
ON public.user_leads 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS user_leads_user_id_idx ON public.user_leads(user_id);
CREATE INDEX IF NOT EXISTS user_leads_created_at_idx ON public.user_leads(created_at);
