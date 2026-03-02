import fs from 'node:fs';
import path from 'node:path';
import { createAdminClient, sleep } from './_supabase.mjs';

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const getDomain = (email) => {
  const at = email.lastIndexOf('@');
  if (at < 0) return '';
  return email.slice(at + 1).trim().toLowerCase();
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const outIdx = args.indexOf('--out');
  const out = outIdx >= 0 ? args[outIdx + 1] : 'reports/disposable-scan.json';
  return { out };
};

const main = async () => {
  const { out } = parseArgs();
  const supabase = createAdminClient();

  const { data: domains, error: domErr } = await supabase.from('disposable_email_domains').select('domain');
  if (domErr) throw domErr;
  const disposableSet = new Set((domains ?? []).map((d) => String(d.domain).toLowerCase()));

  const pageSize = 1000;
  let offset = 0;

  let total = 0;
  let matches = 0;
  const byDomain = {};
  const sample = [];

  for (;;) {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id,email,is_blocked,is_disposable_email')
      .not('email', 'is', null)
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    if (!profiles || profiles.length === 0) break;

    offset += profiles.length;
    total += profiles.length;

    for (const p of profiles) {
      const email = String(p.email ?? '').trim().toLowerCase();
      if (!email || !isEmail(email)) continue;
      const domain = getDomain(email);
      if (!domain) continue;
      if (!disposableSet.has(domain)) continue;

      matches += 1;
      byDomain[domain] = (byDomain[domain] ?? 0) + 1;
      if (sample.length < 50) {
        sample.push({
          id: p.id,
          email,
          domain,
          is_blocked: Boolean(p.is_blocked),
          is_disposable_email: Boolean(p.is_disposable_email),
        });
      }
    }

    if (profiles.length < pageSize) break;
    await sleep(50);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    totalScanned: total,
    matchedDisposable: matches,
    topDomains: Object.entries(byDomain)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([domain, count]) => ({ domain, count })),
    sample,
  };

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(`Wrote report: ${out}`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

