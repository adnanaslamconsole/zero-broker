import { createAdminClient, chunk, sleep } from './_supabase.mjs';

const SOURCE_URL =
  process.env.DISPOSABLE_SOURCE_URL ??
  'https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/master/disposable_email_blocklist.conf';
const SOURCE_NAME = process.env.DISPOSABLE_SOURCE_NAME ?? 'github';

const isEmailDomain = (domain) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain);

const readLines = (text) =>
  text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#') && !l.startsWith('//'));

const main = async () => {
  const supabase = createAdminClient();

  const resp = await fetch(SOURCE_URL);
  if (!resp.ok) throw new Error(`Failed to fetch list: ${resp.status}`);
  const text = await resp.text();

  const domains = Array.from(
    new Set(
      readLines(text)
        .map((d) => d.toLowerCase())
        .filter(isEmailDomain)
    )
  );

  const { data: summary, error: syncError } = await supabase.rpc('sync_disposable_email_domains', {
    p_source: SOURCE_NAME,
    p_domains: domains,
    p_delete_stale: true,
    p_initiated_by: null,
  });

  if (!syncError) {
    console.log(JSON.stringify({ source: SOURCE_NAME, url: SOURCE_URL, summary }, null, 2));
    return;
  }

  let upserted = 0;
  let errors = 0;
  const runAt = new Date().toISOString();
  const batches = chunk(domains, 500);
  for (let i = 0; i < batches.length; i++) {
    const rows = batches[i].map((domain) => ({ domain, source: SOURCE_NAME, last_seen_at: runAt }));
    const { error } = await supabase.from('disposable_email_domains').upsert(rows, { onConflict: 'domain' });
    if (error) {
      errors += 1;
      console.error('upsert failed', { i, error });
    } else {
      upserted += rows.length;
    }
    if (i % 10 === 0) await sleep(50);
  }

  const { error: deleteError } = await supabase
    .from('disposable_email_domains')
    .delete()
    .eq('source', SOURCE_NAME)
    .lt('last_seen_at', runAt);

  if (deleteError) {
    errors += 1;
    console.error('delete stale failed', deleteError);
  }

  console.log(
    JSON.stringify(
      { source: SOURCE_NAME, upserted, errors, url: SOURCE_URL, note: 'rpc_sync_unavailable' },
      null,
      2
    )
  );
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
