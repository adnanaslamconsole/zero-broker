-- Disposable/temporary email hygiene tables + audit

-- 1) Domain blocklist
CREATE TABLE IF NOT EXISTS public.disposable_email_domains (
  domain TEXT PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'github',
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.disposable_email_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Disposable domains are viewable by everyone"
ON public.disposable_email_domains
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage disposable domains"
ON public.disposable_email_domains
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
    AND 'platform-admin' = ANY(p.roles)
  )
);

CREATE TRIGGER on_disposable_email_domains_updated
  BEFORE UPDATE ON public.disposable_email_domains
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_disposable_email_domains_last_seen_at
  ON public.disposable_email_domains (last_seen_at);

-- 2) Profile hygiene fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_disposable_email BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS disposable_email_domain TEXT,
  ADD COLUMN IF NOT EXISTS disposable_email_detected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS blocked_reason TEXT,
  ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_is_disposable_email
  ON public.profiles (is_disposable_email);

CREATE INDEX IF NOT EXISTS idx_profiles_disposable_email_domain
  ON public.profiles (disposable_email_domain);

-- 3) Cleanup run tracking (rollback + reporting)
CREATE TABLE IF NOT EXISTS public.disposable_email_cleanup_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  dry_run BOOLEAN NOT NULL DEFAULT true,
  total_scanned INTEGER NOT NULL DEFAULT 0,
  matched_disposable INTEGER NOT NULL DEFAULT 0,
  flagged_blocked INTEGER NOT NULL DEFAULT 0,
  notified INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);

ALTER TABLE public.disposable_email_cleanup_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view cleanup runs"
ON public.disposable_email_cleanup_runs
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
    AND 'platform-admin' = ANY(p.roles)
  )
);

CREATE POLICY "Admins can create cleanup runs"
ON public.disposable_email_cleanup_runs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
    AND 'platform-admin' = ANY(p.roles)
  )
);

CREATE POLICY "Admins can update cleanup runs"
ON public.disposable_email_cleanup_runs
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
    AND 'platform-admin' = ANY(p.roles)
  )
);

CREATE TABLE IF NOT EXISTS public.disposable_email_cleanup_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES public.disposable_email_cleanup_runs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT,
  domain TEXT,
  previous_is_blocked BOOLEAN,
  action TEXT NOT NULL CHECK (action IN ('match', 'flag', 'notify', 'rollback')),
  status TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'skipped', 'failed')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.disposable_email_cleanup_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view cleanup items"
ON public.disposable_email_cleanup_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
    AND 'platform-admin' = ANY(p.roles)
  )
);

CREATE POLICY "Admins can create cleanup items"
ON public.disposable_email_cleanup_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
    AND 'platform-admin' = ANY(p.roles)
  )
);

-- 4) Helpers for efficient matching
CREATE OR REPLACE FUNCTION public.email_domain(p_email TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT NULLIF(lower(split_part(p_email, '@', 2)), '');
$$;

CREATE OR REPLACE FUNCTION public.is_disposable_email(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.disposable_email_domains d
    WHERE d.domain = public.email_domain(p_email)
  );
$$;

