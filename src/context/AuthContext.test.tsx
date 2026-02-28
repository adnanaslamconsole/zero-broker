import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import React from 'react';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signInWithOAuth: jest.fn(),
      signOut: jest.fn(),
      mfa: {
        enroll: jest.fn(),
        challengeAndVerify: jest.fn(),
        unenroll: jest.fn(),
      }
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null }))
    }))
  }
}));

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  }
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthContext Security Features', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('signUp enforces strong password validation', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Weak password
    await act(async () => {
      try {
        await result.current.signUp('test@example.com', 'weak', 'Test User');
      } catch (e) {}
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
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
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
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' }
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      try {
        await result.current.signIn('test@example.com', 'Wrong123!');
      } catch (e) {}
    });

    expect(supabase.from).toHaveBeenCalledWith('security_logs');
    expect(toast.error).toHaveBeenCalledWith('Invalid email or password.');
  });

  test('MFA enrollment returns QR code and secret', async () => {
    (supabase.auth.mfa.enroll as jest.Mock).mockResolvedValue({
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
    (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
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
});
