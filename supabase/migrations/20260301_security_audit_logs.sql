-- Create security_logs table for audit trails
CREATE TABLE IF NOT EXISTS public.security_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for security audit
CREATE INDEX idx_security_logs_user_id ON public.security_logs(user_id);
CREATE INDEX idx_security_logs_event_type ON public.security_logs(event_type);
CREATE INDEX idx_security_logs_created_at ON public.security_logs(created_at);

-- Enable RLS
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read all logs
CREATE POLICY "Admins can read all security logs"
    ON public.security_logs
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND 'platform-admin' = ANY(roles)
    ));

-- Users can see their own logs
CREATE POLICY "Users can see their own security logs"
    ON public.security_logs
    FOR SELECT
    USING (user_id = auth.uid());

-- System can insert logs (via service role or authenticated users)
CREATE POLICY "Anyone can insert logs"
    ON public.security_logs
    FOR INSERT
    WITH CHECK (true);
