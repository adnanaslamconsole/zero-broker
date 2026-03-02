import { createAdminClient, sleep } from './_supabase.mjs';

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const getDomain = (email) => {
  const at = email.lastIndexOf('@');
  if (at < 0) return '';
  return email.slice(at + 1).trim().toLowerCase();
};

const parseArgs = () => {
  const args = new Set(process.argv.slice(2));
  return {
    dryRun: args.has('--dry-run'),
    notify: args.has('--notify'),
    maxUsers: Number(process.env.MAX_USERS ?? 5000),
    batchSize: Number(process.env.BATCH_SIZE ?? 200),
  };
};

const sendResendEmail = async (to, subject, text, requestId) => {
  const resendApiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? 'onboarding@resend.dev';
  if (!resendApiKey) throw new Error('Missing env var: RESEND_API_KEY');

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

const main = async () => {
  const { dryRun, notify, maxUsers, batchSize } = parseArgs();
  const requestId = `run_${Date.now()}`;
  const supabase = createAdminClient();

  const { data: domains, error: domErr } = await supabase.from('disposable_email_domains').select('domain');
  if (domErr) throw domErr;
  const disposableSet = new Set((domains ?? []).map((d) => String(d.domain).toLowerCase()));

  const { data: runRow, error: runErr } = await supabase
    .from('disposable_email_cleanup_runs')
    .insert({
      initiated_by: null,
      dry_run: dryRun,
      notes: `script=${requestId} batchSize=${batchSize} maxUsers=${maxUsers} notify=${notify}`,
    })
    .select('*')
    .single();
  if (runErr || !runRow) throw runErr ?? new Error('Failed to create run');

  const runId = runRow.id;

  let totalScanned = 0;
  let matched = 0;
  let flagged = 0;
  let notified = 0;
  let errors = 0;

  let offset = 0;
  while (totalScanned < maxUsers) {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id,email,is_blocked,is_disposable_email')
      .not('email', 'is', null)
      .range(offset, offset + batchSize - 1);
    if (error) throw error;
    if (!profiles || profiles.length === 0) break;

    offset += profiles.length;
    totalScanned += profiles.length;

    const disposableUsers = [];
    for (const p of profiles) {
      const email = String(p.email ?? '').trim().toLowerCase();
      if (!email || !isEmail(email)) continue;
      const domain = getDomain(email);
      if (!domain || !disposableSet.has(domain)) continue;
      disposableUsers.push({
        id: p.id,
        email,
        domain,
        prevBlocked: Boolean(p.is_blocked),
      });
    }

    if (disposableUsers.length === 0) continue;
    matched += disposableUsers.length;

    await supabase.from('disposable_email_cleanup_items').insert(
      disposableUsers.map((u) => ({
        run_id: runId,
        user_id: u.id,
        email: u.email,
        domain: u.domain,
        previous_is_blocked: u.prevBlocked,
        action: 'match',
        status: 'ok',
      }))
    );

    if (!dryRun) {
      const idsToFlag = disposableUsers.filter((u) => !u.prevBlocked).map((u) => u.id);
      if (idsToFlag.length > 0) {
        const now = new Date().toISOString();
        const { error: updErr } = await supabase
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
          console.error('flag update failed', updErr);
        } else {
          flagged += idsToFlag.length;
          await supabase.from('disposable_email_cleanup_items').insert(
            idsToFlag.map((id) => ({
              run_id: runId,
              user_id: id,
              action: 'flag',
              status: 'ok',
            }))
          );
        }
      }

      if (notify) {
        const subject = 'Important: Your ZeroBroker account email needs review';
        const text =
          'We detected that your account email domain may be a disposable/temporary email provider. If this is incorrect, please contact support to restore access.';
        for (const u of disposableUsers) {
          const ok = await sendResendEmail(u.email, subject, text, requestId);
          await supabase.from('disposable_email_cleanup_items').insert({
            run_id: runId,
            user_id: u.id,
            email: u.email,
            domain: u.domain,
            action: 'notify',
            status: ok ? 'ok' : 'failed',
            error: ok ? null : 'resend_failed',
          });
          if (ok) notified += 1;
          else errors += 1;
          await sleep(50);
        }
      }
    }

    if (profiles.length < batchSize) break;
    await sleep(50);
  }

  await supabase
    .from('disposable_email_cleanup_runs')
    .update({
      finished_at: new Date().toISOString(),
      status: errors > 0 ? 'failed' : 'completed',
      total_scanned: totalScanned,
      matched_disposable: matched,
      flagged_blocked: flagged,
      notified,
      errors,
    })
    .eq('id', runId);

  console.log(JSON.stringify({ runId, dryRun, totalScanned, matched, flagged, notified, errors }, null, 2));
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

