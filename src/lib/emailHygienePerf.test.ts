import { describe, expect, it } from 'vitest';
import { getEmailDomain } from './disposableEmailGuard';

describe('email hygiene perf', () => {
  it('extracts domains for 10k emails', () => {
    const emails = Array.from({ length: 10_000 }, (_, i) => `user${i}@example.com`);
    const domains = emails.map(getEmailDomain);
    expect(domains[0]).toBe('example.com');
    expect(domains[9999]).toBe('example.com');
  });
});

