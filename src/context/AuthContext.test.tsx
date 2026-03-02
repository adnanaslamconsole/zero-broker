import { beforeEach, describe, expect, test, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import React from 'react';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(() => Promise.resolve({ data: { user: { id: 'user_123' } }, error: null })),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      mfa: {
        enroll: vi.fn(),
        challengeAndVerify: vi.fn(),
        unenroll: vi.fn(),
      }
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null }))
    }))
  }
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  }
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthContext Security Features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  test('signUp enforces strong password validation', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Weak password
    await act(async () => {
      try {
        await result.current.signUp('test@example.com', 'weak', 'Test User');
      } catch (e) { void e; }
    });

    expect(supabase.auth.signUp).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Password must be at least 8 characters long'));

    // Strong password
    await act(async () => {
      await result.current.signUp('test@example.com', 'Strong123!', 'Test User');
    });

    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'Strong123!',
      options: expect.any(Object)
    });
  });

  test('signIn logs security events on success', async () => {
    (supabase.auth.signInWithPassword as unknown as { mockResolvedValue: (value: unknown) => unknown }).mockResolvedValue({
      data: { user: { id: 'user_123' } },
      error: null
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signIn('test@example.com', 'Strong123!');
    });

    expect(supabase.from).toHaveBeenCalledWith('security_logs');
    expect(toast.success).toHaveBeenCalledWith('Logged in successfully!');
  });

  test('signIn logs security events on failure', async () => {
    (supabase.auth.signInWithPassword as unknown as { mockResolvedValue: (value: unknown) => unknown }).mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' }
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      try {
        await result.current.signIn('test@example.com', 'Wrong123!');
      } catch (e) { void e; }
    });

    expect(supabase.from).toHaveBeenCalledWith('security_logs');
    expect(toast.error).toHaveBeenCalledWith('Invalid email or password.');
  });

  test('MFA enrollment returns QR code and secret', async () => {
    (supabase.auth.mfa.enroll as unknown as { mockResolvedValue: (value: unknown) => unknown }).mockResolvedValue({
      data: { id: 'factor_123', totp: { qr_code: 'qr_data', secret: 'secret_key' } },
      error: null
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    let mfaData;
    await act(async () => {
      mfaData = await result.current.enrollMfa();
    });

    expect(mfaData).toEqual({
      qrCode: 'qr_data',
      secret: 'secret_key',
      factorId: 'factor_123'
    });
  });

  test('OAuth login initiates correctly', async () => {
    (supabase.auth.signInWithOAuth as unknown as { mockResolvedValue: (value: unknown) => unknown }).mockResolvedValue({
      data: { url: 'https://google.com' },
      error: null
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signInWithOAuth('google');
    });

    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: expect.any(Object)
    });
  });

  test('uses friendly error messages for database constraint-like errors', async () => {
    (supabase.auth.signInWithOAuth as unknown as { mockResolvedValue: (value: unknown) => unknown }).mockResolvedValue({
      data: null,
      error: {
        code: '23505',
        message: 'duplicate key value violates unique constraint "profiles_mobile_key"',
      }
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signInWithOAuth('google');
    });

    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('mobile'));
    expect(toast.error).toHaveBeenCalledWith(expect.not.stringContaining('duplicate key'));
  });

  test('updateProfile validates input and updates local demo session', async () => {
    localStorage.setItem(
      'zerobroker-demo-session',
      JSON.stringify({
        id: '00000000-0000-0000-0000-000000000000',
        name: 'Demo User',
        email: 'dummy@zerobroker.in',
        mobile: '9999999999',
        avatarUrl: null,
        roles: ['tenant'],
        primaryRole: 'tenant',
        kycStatus: 'verified',
        kycDocuments: [],
        trustScore: 100,
        isBlocked: false,
        isDemo: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      try {
        await result.current.updateProfile({ name: 'A', mobile: '123' });
      } catch (e) { void e; }
    });

    expect(result.current.user?.profile.name).toBe('Demo User');

    await act(async () => {
      await result.current.updateProfile({ name: 'Updated Name', mobile: '+919876543210' });
    });

    expect(result.current.user?.profile.name).toBe('Updated Name');
    expect(result.current.user?.profile.mobile).toBe('+919876543210');

    const stored = JSON.parse(localStorage.getItem('zerobroker-demo-session') || '{}');
    expect(stored.name).toBe('Updated Name');
    expect(stored.mobile).toBe('+919876543210');
  });

  test('uploadAvatar validates file type and updates avatarUrl for demo user', async () => {
    localStorage.setItem(
      'zerobroker-demo-session',
      JSON.stringify({
        id: '00000000-0000-0000-0000-000000000000',
        name: 'Demo User',
        email: 'dummy@zerobroker.in',
        mobile: '9999999999',
        avatarUrl: null,
        roles: ['tenant'],
        primaryRole: 'tenant',
        kycStatus: 'verified',
        kycDocuments: [],
        trustScore: 100,
        isBlocked: false,
        isDemo: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    const badFile = new File(['hello'], 'hello.txt', { type: 'text/plain' });
    await act(async () => {
      try {
        await result.current.uploadAvatar(badFile);
      } catch (e) { void e; }
    });

    expect(result.current.user?.profile.avatarUrl).toBe(null);

    const okFile = new File([new Uint8Array([1, 2, 3])], 'avatar.png', { type: 'image/png' });
    await act(async () => {
      await result.current.uploadAvatar(okFile);
    });

    expect(result.current.user?.profile.avatarUrl).toMatch(/^data:image\/png;base64,/);
  });
});
