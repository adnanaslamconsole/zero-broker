import { describe, expect, it, vi } from 'vitest';
import { sendEmail, validateSendEmailParams } from './emailService';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('validateSendEmailParams', () => {
  it('rejects invalid recipient email', () => {
    expect(() =>
      validateSendEmailParams({ to: 'not-an-email', subject: 'Hello', text: 'Hi' })
    ).toThrow(/recipient/i);
  });

  it('rejects missing content', () => {
    expect(() =>
      validateSendEmailParams({ to: 'a@b.com', subject: 'Hello' })
    ).toThrow(/content/i);
  });
});

describe('sendEmail', () => {
  it('retries on temporary function errors and succeeds', async () => {
    const { supabase } = await import('@/lib/supabase');
    const invoke = supabase.functions.invoke as unknown as ReturnType<typeof vi.fn>;

    invoke
      .mockRejectedValueOnce({ message: 'Failed to fetch' })
      .mockResolvedValueOnce({ data: { id: 'email_123' }, error: null });

    const result = await sendEmail({ to: 'a@b.com', subject: 'Hello', text: 'Hi' });
    expect(result.id).toBe('email_123');
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it('throws a user-friendly error on non-retryable failures', async () => {
    const { supabase } = await import('@/lib/supabase');
    const invoke = supabase.functions.invoke as unknown as ReturnType<typeof vi.fn>;

    invoke.mockResolvedValueOnce({
      data: null,
      error: { message: 'Not authenticated', context: { status: 401 } },
    });

    await expect(sendEmail({ to: 'a@b.com', subject: 'Hello', text: 'Hi' })).rejects.toThrow(/log in|login/i);
  });
});

