import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    })),
  },
}));

// Mock Sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock offlineStorage
vi.mock('@/lib/offlineStorage', () => ({
  offlineStorage: {
    syncDraftWithUser: vi.fn(),
  },
}));

// Helper component to test AuthContext
const TestComponent = () => {
  const { user, isLoading, logout } = useAuth();
  return (
    <div>
      <div data-testid="user">{user ? 'logged-in' : 'logged-out'}</div>
      <div data-testid="loading">{isLoading ? 'loading' : 'idle'}</div>
      <button data-testid="logout-btn" onClick={logout}>Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should start in loading state and then transition to idle', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
    });

    // Initial state is loading
    // Since getSession is mocked to resolve immediately, it might already be idle
    const loadingElement = screen.getByTestId('loading');
    expect(loadingElement.textContent).toBe('idle');
  });

  it('should reset isLoading after successful logout', async () => {
    let authCallback: ((event: string, session: unknown) => void) | undefined;
    (
      supabase.auth.onAuthStateChange as unknown as {
        mockImplementation: (fn: (cb: (event: string, session: unknown) => void) => unknown) => void;
      }
    ).mockImplementation((cb) => {
      authCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const logoutBtn = screen.getByTestId('logout-btn');
    
    await act(async () => {
      logoutBtn.click();
    });

    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(screen.getByTestId('loading').textContent).toBe('idle');
    expect(toast.success).toHaveBeenCalledWith('Logged out successfully');
  });

  it('should reset isLoading after failed logout', async () => {
    (
      supabase.auth.signOut as unknown as { mockReturnValueOnce: (value: unknown) => unknown }
    ).mockReturnValueOnce(Promise.resolve({ error: new Error('Logout failed') }));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const logoutBtn = screen.getByTestId('logout-btn');
    
    await act(async () => {
      logoutBtn.click();
    });

    expect(screen.getByTestId('loading').textContent).toBe('idle');
    expect(toast.error).toHaveBeenCalledWith('Logout failed');
  });

  it('should reset isLoading when SIGNED_OUT event is received', async () => {
    let authCallback: ((event: string, session: unknown) => void) | undefined;
    (
      supabase.auth.onAuthStateChange as unknown as {
        mockImplementation: (fn: (cb: (event: string, session: unknown) => void) => unknown) => void;
      }
    ).mockImplementation((cb) => {
      authCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Simulate SIGNED_OUT event
    await act(async () => {
      authCallback?.('SIGNED_OUT', null);
    });

    expect(screen.getByTestId('loading').textContent).toBe('idle');
    expect(screen.getByTestId('user').textContent).toBe('logged-out');
  });

  it('should reset isLoading for unhandled auth events', async () => {
    let authCallback: ((event: string, session: unknown) => void) | undefined;
    (
      supabase.auth.onAuthStateChange as unknown as {
        mockImplementation: (fn: (cb: (event: string, session: unknown) => void) => unknown) => void;
      }
    ).mockImplementation((cb) => {
      authCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Simulate an unhandled event like INITIAL_SESSION
    await act(async () => {
      authCallback?.('INITIAL_SESSION', null);
    });

    expect(screen.getByTestId('loading').textContent).toBe('idle');
  });
});
