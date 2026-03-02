import { createAdminClient } from './_supabase.mjs';

const parseArgs = () => {
  const args = process.argv.slice(2);
  const idx = args.indexOf('--run');
  const runId = idx >= 0 ? args[idx + 1] : '';
  if (!runId) throw new Error('Usage: node scripts/email-hygiene/rollback-run.mjs --run <RUN_ID>');
  return { runId };
};

const main = async () => {
  const { runId } = parseArgs();
  const supabase = createAdminClient();

  const { data: items, error } = await supabase
    .from('disposable_email_cleanup_items')
    .select('user_id,previous_is_blocked')
    .eq('run_id', runId)
    .eq('action', 'match');

  if (error) throw error;
  const toUnblock = (items ?? [])
    .filter((i) => i.previous_is_blocked === false)
    .map((i) => i.user_id);

  if (toUnblock.length === 0) {
    console.log(JSON.stringify({ runId, unblocked: 0 }, null, 2));
    return;
  }

  const { error: updErr } = await supabase
    .from('profiles')
    .update({
      is_blocked: false,
      blocked_reason: null,
      blocked_at: null,
      is_disposable_email: false,
      disposable_email_detected_at: null,
      disposable_email_domain: null,
    })
    .in('id', toUnblock);

  if (updErr) throw updErr;

  await supabase.from('disposable_email_cleanup_items').insert(
    toUnblock.map((id) => ({
      run_id: runId,
      user_id: id,
      action: 'rollback',
      status: 'ok',
    }))
  );

  console.log(JSON.stringify({ runId, unblocked: toUnblock.length }, null, 2));
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

