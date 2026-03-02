import { describe, expect, it } from 'vitest';
import { parseDisposableDomainsText } from '../../supabase/functions/_shared/domainSync.ts';

describe('parseDisposableDomainsText', () => {
  it('parses, normalizes, validates, and dedupes domains', () => {
    const text = `
# comment
TrashMail.com
trashmail.com
example
foo..bar.com
.start.com
end.com.
ok-domain.co.in
`;

    const result = parseDisposableDomainsText(text);
    expect(result.validDomains).toEqual(['trashmail.com', 'ok-domain.co.in']);
    expect(result.invalidDomains).toEqual(['example', 'foo..bar.com', '.start.com', 'end.com.']);
    expect(result.duplicatesSkipped).toBe(1);
  });
});

