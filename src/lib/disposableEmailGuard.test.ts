import { describe, expect, it, vi } from 'vitest';
import { assertEmailNotDisposable, getEmailDomain, isValidEmail } from './disposableEmailGuard';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('disposableEmailGuard helpers', () => {
  it('extracts email domain', () => {
    expect(getEmailDomain('Test@Example.com')).toBe('example.com');
  });

  it('validates email format', () => {
    expect(isValidEmail('a@b.com')).toBe(true);
    expect(isValidEmail('nope')).toBe(false);
  });
});

describe('assertEmailNotDisposable', () => {
  it('throws when provider says disposable', async () => {
    const { supabase } = await import('@/lib/supabase');
    const invoke = supabase.functions.invoke as unknown as ReturnType<typeof vi.fn>;
    invoke.mockResolvedValueOnce({
      data: {
        disposable: true,
        message:
          'Temporary or disposable email addresses are not accepted. Please use a permanent email address for account recovery and important updates.',
      },
      error: null,
    });

    await expect(assertEmailNotDisposable('a@trashmail.com')).rejects.toThrow(/disposable/i);
  });

  it('passes when provider says not disposable', async () => {
    const { supabase } = await import('@/lib/supabase');
    const invoke = supabase.functions.invoke as unknown as ReturnType<typeof vi.fn>;
    invoke.mockResolvedValueOnce({ data: { disposable: false }, error: null });

    await expect(assertEmailNotDisposable('a@company.com')).resolves.toBeUndefined();
  });
});
