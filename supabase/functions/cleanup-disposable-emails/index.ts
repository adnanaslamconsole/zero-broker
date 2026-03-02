import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders } from '../_shared/cors.ts';

type CleanupBody = {
  dryRun?: boolean;
  batchSize?: number;
  maxUsers?: number;
  notify?: boolean;
  subject?: string;
  messageText?: string;
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const getDomain = (email: string) => {
  const at = email.lastIndexOf('@');
  if (at < 0) return '';
  return email.slice(at + 1).trim().toLowerCase();
};

const pickString = (...values: Array<unknown>) => {
  for (const v of values) {
    if (typeof v === 'string' && v.trim().length > 0) return v;
  }
  return '';
};

const sendResendEmail = async (
  resendApiKey: string,
  from: string,
  to: string,
  subject: string,
  text: string,
  requestId: string
) => {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `${requestId}:${to}`,
        },
        body: JSON.stringify({ from, to, subject, text }),
      });

      if (resp.ok) return true;
      const shouldRetry = resp.status >= 500 || resp.status === 429;
      if (attempt < maxAttempts && shouldRetry) {
        await sleep(250 * 2 ** (attempt - 1));
        continue;
      }
      return false;
    } catch {
      if (attempt < maxAttempts) {
        await sleep(250 * 2 ** (attempt - 1));
        continue;
      }
      return false;
    }
  }
  return false;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const requestId = crypto.randomUUID();
  const authHeader = req.headers.get('Authorization') ?? '';

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      console.error('cleanup-disposable-emails misconfigured', { requestId });
      return json(500, { error: 'Server misconfiguration' });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json(401, { error: 'Not authenticated' });

    const { data: profileRow } = await userClient
      .from('profiles')
      .select('roles')
      .eq('id', user.id)
      .maybeSingle();
    const roles = (profileRow?.roles ?? []) as string[];
    if (!roles.includes('platform-admin')) return json(403, { error: 'Not authorized' });

    const body = (await req.json().catch(() => ({}))) as CleanupBody;
    const dryRun = Boolean(body.dryRun);
    const batchSize = Math.max(1, Math.min(500, Number(body.batchSize ?? 200)));
    const maxUsers = Math.max(1, Math.min(50_000, Number(body.maxUsers ?? 5_000)));
    const notify = Boolean(body.notify);

    const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? '';
    const emailFrom = pickString(Deno.env.get('EMAIL_FROM'), 'onboarding@resend.dev').trim();
    const subject = pickString(body.subject, 'Important: Your ZeroBroker account email needs review').trim();
    const messageText = pickString(
      body.messageText,
      'We detected that your account email domain may be a disposable/temporary email provider. If this is incorrect, please contact support to restore access.'
    ).trim();

    if (notify && (!resendApiKey || !emailFrom)) {
      return json(500, { error: 'Email notification is not configured' });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: runRow, error: runErr } = await adminClient
      .from('disposable_email_cleanup_runs')
      .insert({
        initiated_by: user.id,
        dry_run: dryRun,
        notes: `requestId=${requestId} batchSize=${batchSize} maxUsers=${maxUsers} notify=${notify}`,
      })
      .select('*')
      .single();

    if (runErr || !runRow) return json(500, { error: 'Failed to start cleanup run' });
    const runId = runRow.id as string;

    let totalScanned = 0;
    let matched = 0;
    let flagged = 0;
    let notifiedCount = 0;
    let errors = 0;

    let offset = 0;
    while (totalScanned < maxUsers) {
      const { data: profiles, error } = await adminClient
        .from('profiles')
        .select('id,email,is_blocked,is_disposable_email')
        .not('email', 'is', null)
        .range(offset, offset + batchSize - 1);

      if (error) {
        errors += 1;
        console.error('cleanup-disposable-emails profiles fetch failed', { requestId, error });
        break;
      }

      if (!profiles || profiles.length === 0) break;

      offset += profiles.length;
      totalScanned += profiles.length;

      const matches = profiles
        .map((p) => ({
          id: p.id as string,
          email: (p.email as string | null) ?? '',
          domain: getDomain((p.email as string | null) ?? ''),
          isBlocked: Boolean(p.is_blocked),
          isDisposable: Boolean(p.is_disposable_email),
        }))
        .filter((p) => p.email && isEmail(p.email) && p.domain.length > 0);

      if (matches.length === 0) continue;

      const uniqueDomains = Array.from(new Set(matches.map((m) => m.domain)));
      const { data: domainRows, error: domainErr } = await adminClient
        .from('disposable_email_domains')
        .select('domain')
        .in('domain', uniqueDomains);

      if (domainErr) {
        errors += 1;
        console.error('cleanup-disposable-emails domains fetch failed', { requestId, domainErr });
        continue;
      }

      const disposableSet = new Set((domainRows ?? []).map((d) => (d.domain as string).toLowerCase()));
      const disposableUsers = matches.filter((m) => disposableSet.has(m.domain));
      if (disposableUsers.length === 0) continue;

      matched += disposableUsers.length;

      const itemRows = disposableUsers.map((u) => ({
        run_id: runId,
        user_id: u.id,
        email: u.email,
        domain: u.domain,
        previous_is_blocked: u.isBlocked,
        action: 'match',
        status: 'ok',
      }));
      await adminClient.from('disposable_email_cleanup_items').insert(itemRows);

      if (!dryRun) {
        const idsToFlag = disposableUsers.filter((u) => !u.isBlocked).map((u) => u.id);
        if (idsToFlag.length > 0) {
          const now = new Date().toISOString();
          const { error: updErr } = await adminClient
            .from('profiles')
            .update({
              is_blocked: true,
              blocked_reason: 'disposable_email',
              blocked_at: now,
              is_disposable_email: true,
              disposable_email_detected_at: now,
            })
            .in('id', idsToFlag);

          if (updErr) {
            errors += 1;
            console.error('cleanup-disposable-emails flag update failed', { requestId, updErr });
          } else {
            flagged += idsToFlag.length;
            const flagRows = idsToFlag.map((id) => ({
              run_id: runId,
              user_id: id,
              action: 'flag',
              status: 'ok',
            }));
            await adminClient.from('disposable_email_cleanup_items').insert(flagRows);
          }
        }

        if (notify && resendApiKey) {
          for (const u of disposableUsers) {
            if (!u.email) continue;
            const ok = await sendResendEmail(resendApiKey, emailFrom, u.email, subject, messageText, requestId);
            await adminClient.from('disposable_email_cleanup_items').insert({
              run_id: runId,
              user_id: u.id,
              email: u.email,
              domain: u.domain,
              action: 'notify',
              status: ok ? 'ok' : 'failed',
              error: ok ? null : 'resend_failed',
            });
            if (ok) notifiedCount += 1;
            else errors += 1;
            await sleep(50);
          }
        }
      }

      if (profiles.length < batchSize) break;
      await sleep(50);
    }

    await adminClient
      .from('disposable_email_cleanup_runs')
      .update({
        finished_at: new Date().toISOString(),
        status: errors > 0 ? 'failed' : 'completed',
        total_scanned: totalScanned,
        matched_disposable: matched,
        flagged_blocked: flagged,
        notified: notifiedCount,
        errors,
      })
      .eq('id', runId);

    return json(200, {
      runId,
      dryRun,
      totalScanned,
      matched,
      flagged,
      notified: notifiedCount,
      errors,
    });
  } catch (error) {
    console.error('cleanup-disposable-emails unexpected error', { requestId, error: String(error) });
    return json(500, { error: 'Unexpected server error' });
  }
});

