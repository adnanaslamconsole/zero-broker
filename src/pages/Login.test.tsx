import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type React from 'react';

let authState: {
  user: { profile: { id: string } } | null;
  loginWithOtp: (identifier: string, type: 'email' | 'phone') => Promise<void>;
  verifyOtp: (identifier: string, token: string, type: 'email' | 'phone') => Promise<void>;
};

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('@/components/layout/Header', () => ({
  Header: () => <div data-testid="header" />,
}));

vi.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
}));

vi.mock('framer-motion', () => {
  const passthrough = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>{children}</div>
  );
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: new Proxy(
      {},
      {
        get: () => passthrough,
      }
    ),
  };
});

vi.mock('@/lib/disposableEmailGuard', () => ({
  assertEmailNotDisposable: vi.fn(() => Promise.resolve()),
}));

describe('Login', () => {
  beforeEach(() => {
    vi.resetModules();
    authState = {
      user: null,
      loginWithOtp: vi.fn(() => Promise.resolve()),
      verifyOtp: vi.fn(() => Promise.resolve()),
    };
  });

  it('does not show Sending... just because auth is busy or user logged out', async () => {
    const Login = (await import('./Login')).default;
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/type mobile number or email/i), {
      target: { value: 'test@example.com' },
    });

    expect(screen.getByRole('button', { name: /send otp/i })).toBeEnabled();
    expect(screen.queryByText('Sending...')).toBeNull();
  });

  it('resets Sending... state when user transitions to logged out', async () => {
    const Login = (await import('./Login')).default;

    let resolveOtp: (() => void) | undefined;
    const pending = new Promise<void>((r) => {
      resolveOtp = r;
    });

    authState.user = { profile: { id: 'u1' } };
    authState.loginWithOtp = vi.fn(() => pending);

    const view = render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/type mobile number or email/i), {
      target: { value: 'test@example.com' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /send otp/i }));
    });
    expect(await screen.findByText('Sending...')).toBeInTheDocument();

    authState.user = null;
    await act(async () => {
      view.rerender(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );
    });

    expect(screen.queryByText('Sending...')).toBeNull();
    expect(screen.getByRole('button', { name: /send otp/i })).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText(/type mobile number or email/i), {
      target: { value: 'test@example.com' },
    });
    expect(screen.getByRole('button', { name: /send otp/i })).toBeEnabled();

    resolveOtp?.();
  });
});
