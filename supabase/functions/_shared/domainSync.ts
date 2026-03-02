export const isValidDisposableDomain = (domain: string) => {
  const d = domain.trim().toLowerCase();
  if (!d) return false;
  if (d.length > 253) return false;
  if (d.includes('..')) return false;
  if (d.startsWith('.') || d.endsWith('.')) return false;
  return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d);
};

export const parseDisposableDomainsText = (text: string) => {
  const raw = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#') && !l.startsWith('//'));

  const invalidDomains: string[] = [];
  const seen = new Set<string>();
  const validDomains: string[] = [];

  let duplicatesSkipped = 0;
  for (const line of raw) {
    const d = line.toLowerCase();
    if (!isValidDisposableDomain(d)) {
      invalidDomains.push(d);
      continue;
    }
    if (seen.has(d)) {
      duplicatesSkipped += 1;
      continue;
    }
    seen.add(d);
    validDomains.push(d);
  }

  return { validDomains, invalidDomains, duplicatesSkipped };
};

