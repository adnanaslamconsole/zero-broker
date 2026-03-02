import { createAdminClient } from './_supabase.mjs';

const parseArgs = () => {
  const args = process.argv.slice(2);
  const idx = args.indexOf('--run');
  const runId = idx >= 0 ? args[idx + 1] : '';
  if (!runId) throw new Error('Usage: node scripts/email-hygiene/rollback-domain-sync.mjs --run <RUN_ID>');
  return { runId };
};

const main = async () => {
  const { runId } = parseArgs();
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('rollback_disposable_email_domain_sync', { p_run_id: runId });
  if (error) throw error;
  console.log(JSON.stringify({ runId, result: data }, null, 2));
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

