CREATE TABLE IF NOT EXISTS public.disposable_email_domain_sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  initiated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'rolled_back')),
  received INTEGER NOT NULL DEFAULT 0,
  valid INTEGER NOT NULL DEFAULT 0,
  invalid INTEGER NOT NULL DEFAULT 0,
  inserted INTEGER NOT NULL DEFAULT 0,
  updated INTEGER NOT NULL DEFAULT 0,
  deleted INTEGER NOT NULL DEFAULT 0,
  skipped_duplicates INTEGER NOT NULL DEFAULT 0,
  error TEXT
);

ALTER TABLE public.disposable_email_domain_sync_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view domain sync runs"
ON public.disposable_email_domain_sync_runs
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
    AND 'platform-admin' = ANY(p.roles)
  )
);

CREATE TABLE IF NOT EXISTS public.disposable_email_domain_sync_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES public.disposable_email_domain_sync_runs(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('insert', 'update', 'delete', 'skip_invalid')),
  domain TEXT NOT NULL,
  previous_source TEXT,
  previous_last_seen_at TIMESTAMPTZ,
  new_source TEXT,
  new_last_seen_at TIMESTAMPTZ,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.disposable_email_domain_sync_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view domain sync audit"
ON public.disposable_email_domain_sync_audit
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
    AND 'platform-admin' = ANY(p.roles)
  )
);

CREATE INDEX IF NOT EXISTS idx_disposable_email_domain_sync_runs_source_started
  ON public.disposable_email_domain_sync_runs (source, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_disposable_email_domain_sync_audit_run_id
  ON public.disposable_email_domain_sync_audit (run_id);

CREATE INDEX IF NOT EXISTS idx_disposable_email_domain_sync_audit_domain
  ON public.disposable_email_domain_sync_audit (domain);

CREATE OR REPLACE FUNCTION public.sync_disposable_email_domains(
  p_source TEXT,
  p_domains TEXT[],
  p_delete_stale BOOLEAN DEFAULT true,
  p_initiated_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id UUID;
  v_source TEXT := COALESCE(NULLIF(trim(p_source), ''), 'github');
  v_run_at TIMESTAMPTZ := now();
  v_received INTEGER := COALESCE(array_length(p_domains, 1), 0);
  v_valid INTEGER := 0;
  v_invalid INTEGER := 0;
  v_inserted INTEGER := 0;
  v_updated INTEGER := 0;
  v_deleted INTEGER := 0;
  v_skipped_duplicates INTEGER := 0;
BEGIN
  INSERT INTO public.disposable_email_domain_sync_runs (
    source,
    initiated_by,
    started_at,
    status,
    received
  )
  VALUES (
    v_source,
    p_initiated_by,
    v_run_at,
    'running',
    v_received
  )
  RETURNING id INTO v_run_id;

  BEGIN
    WITH
    input_raw AS (
      SELECT d AS raw_domain
      FROM unnest(COALESCE(p_domains, ARRAY[]::TEXT[])) AS d
      WHERE d IS NOT NULL AND trim(d) <> ''
    ),
    input_norm AS (
      SELECT lower(trim(raw_domain)) AS domain
      FROM input_raw
    ),
    tagged AS (
      SELECT
        domain,
        CASE
          WHEN length(domain) > 253 THEN false
          WHEN position('..' in domain) > 0 THEN false
          WHEN left(domain, 1) = '.' OR right(domain, 1) = '.' THEN false
          WHEN domain !~ '^[a-z0-9.-]+\.[a-z]{2,}$' THEN false
          ELSE true
        END AS is_valid
      FROM input_norm
    ),
    valid AS (
      SELECT DISTINCT domain
      FROM tagged
      WHERE is_valid
    ),
    invalid AS (
      SELECT domain
      FROM tagged
      WHERE NOT is_valid
    ),
    existing AS (
      SELECT d.domain, d.source AS prev_source, d.last_seen_at AS prev_last_seen_at
      FROM public.disposable_email_domains d
      JOIN valid v ON v.domain = d.domain
    ),
    upserted AS (
      INSERT INTO public.disposable_email_domains (domain, source, last_seen_at)
      SELECT v.domain, v_source, v_run_at
      FROM valid v
      ON CONFLICT (domain)
      DO UPDATE SET
        source = EXCLUDED.source,
        last_seen_at = EXCLUDED.last_seen_at
      RETURNING domain, (xmax = 0) AS inserted
    ),
    audit_upsert AS (
      INSERT INTO public.disposable_email_domain_sync_audit (
        run_id,
        action,
        domain,
        previous_source,
        previous_last_seen_at,
        new_source,
        new_last_seen_at
      )
      SELECT
        v_run_id,
        CASE WHEN u.inserted THEN 'insert' ELSE 'update' END,
        u.domain,
        e.prev_source,
        e.prev_last_seen_at,
        v_source,
        v_run_at
      FROM upserted u
      LEFT JOIN existing e ON e.domain = u.domain
    ),
    deleted AS (
      DELETE FROM public.disposable_email_domains d
      WHERE p_delete_stale
        AND d.source = v_source
        AND d.last_seen_at < v_run_at
      RETURNING d.domain, d.source, d.last_seen_at
    ),
    audit_deleted AS (
      INSERT INTO public.disposable_email_domain_sync_audit (
        run_id,
        action,
        domain,
        previous_source,
        previous_last_seen_at
      )
      SELECT v_run_id, 'delete', domain, source, last_seen_at
      FROM deleted
    ),
    audit_invalid AS (
      INSERT INTO public.disposable_email_domain_sync_audit (
        run_id,
        action,
        domain,
        reason
      )
      SELECT v_run_id, 'skip_invalid', domain, 'invalid_domain_format'
      FROM invalid
    )
    SELECT
      (SELECT count(*) FROM valid) AS valid_count,
      (SELECT count(*) FROM invalid) AS invalid_count,
      (SELECT count(*) FROM upserted WHERE inserted) AS inserted_count,
      (SELECT count(*) FROM upserted WHERE NOT inserted) AS updated_count,
      (SELECT count(*) FROM deleted) AS deleted_count,
      greatest((SELECT count(*) FROM input_norm) - (SELECT count(*) FROM valid) - (SELECT count(*) FROM invalid), 0) AS skipped_duplicates_count
    INTO v_valid, v_invalid, v_inserted, v_updated, v_deleted, v_skipped_duplicates;

    UPDATE public.disposable_email_domain_sync_runs
    SET
      finished_at = now(),
      status = 'completed',
      valid = v_valid,
      invalid = v_invalid,
      inserted = v_inserted,
      updated = v_updated,
      deleted = v_deleted,
      skipped_duplicates = v_skipped_duplicates,
      error = NULL
    WHERE id = v_run_id;
  EXCEPTION
    WHEN OTHERS THEN
      UPDATE public.disposable_email_domain_sync_runs
      SET
        finished_at = now(),
        status = 'failed',
        error = SQLERRM
      WHERE id = v_run_id;

      RETURN jsonb_build_object(
        'runId', v_run_id,
        'status', 'failed',
        'error', SQLERRM
      );
  END;

  RETURN jsonb_build_object(
    'runId', v_run_id,
    'status', 'completed',
    'received', v_received,
    'valid', v_valid,
    'invalid', v_invalid,
    'inserted', v_inserted,
    'updated', v_updated,
    'deleted', v_deleted,
    'skippedDuplicates', v_skipped_duplicates
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.rollback_disposable_email_domain_sync(p_run_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source TEXT;
  v_reverted INTEGER := 0;
  v_skipped INTEGER := 0;
BEGIN
  SELECT source INTO v_source
  FROM public.disposable_email_domain_sync_runs
  WHERE id = p_run_id;

  IF v_source IS NULL THEN
    RETURN jsonb_build_object('status', 'failed', 'error', 'Run not found');
  END IF;

  BEGIN
    WITH updated AS (
      SELECT *
      FROM public.disposable_email_domain_sync_audit
      WHERE run_id = p_run_id
        AND action = 'update'
    )
    UPDATE public.disposable_email_domains d
    SET
      source = u.previous_source,
      last_seen_at = u.previous_last_seen_at
    FROM updated u
    WHERE d.domain = u.domain
      AND d.source = u.new_source
      AND d.last_seen_at = u.new_last_seen_at;

    GET DIAGNOSTICS v_reverted = ROW_COUNT;

    WITH inserted AS (
      SELECT *
      FROM public.disposable_email_domain_sync_audit
      WHERE run_id = p_run_id
        AND action = 'insert'
    )
    DELETE FROM public.disposable_email_domains d
    USING inserted i
    WHERE d.domain = i.domain
      AND d.source = i.new_source
      AND d.last_seen_at = i.new_last_seen_at;

    v_reverted := v_reverted + ROW_COUNT;

    WITH deleted AS (
      SELECT *
      FROM public.disposable_email_domain_sync_audit
      WHERE run_id = p_run_id
        AND action = 'delete'
    )
    INSERT INTO public.disposable_email_domains (domain, source, last_seen_at)
    SELECT d.domain, d.previous_source, d.previous_last_seen_at
    FROM deleted d
    ON CONFLICT (domain) DO NOTHING;

    v_reverted := v_reverted + ROW_COUNT;

    v_skipped := (
      SELECT count(*)
      FROM public.disposable_email_domain_sync_audit a
      WHERE a.run_id = p_run_id
        AND a.action IN ('insert', 'update', 'delete')
    ) - v_reverted;

    UPDATE public.disposable_email_domain_sync_runs
    SET
      status = 'rolled_back',
      finished_at = now()
    WHERE id = p_run_id;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object('status', 'failed', 'error', SQLERRM);
  END;

  RETURN jsonb_build_object(
    'status', 'rolled_back',
    'runId', p_run_id,
    'reverted', v_reverted,
    'skipped', greatest(v_skipped, 0)
  );
END;
$$;

