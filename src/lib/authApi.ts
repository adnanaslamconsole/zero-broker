/**
 * authApi.ts
 * 
 * Thin client for all /api/auth/* endpoints on the Express backend.
 * Uses `credentials: 'include'` so the browser automatically sends and
 * receives the HttpOnly session cookie on every request.
 * 
 * NO tokens are ever stored in JavaScript-accessible storage.
 */

const BASE_URL = import.meta.env.VITE_AUTH_SERVER_URL || 'http://localhost:3000';

async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include',        // Always include HttpOnly cookies
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  return res;
}

export interface AuthUser {
  id: string;
  email?: string;
  name: string;
  mobile?: string | null;
  avatarUrl?: string | null;
  roles: string[];
  primaryRole: string;
  kycStatus: string;
  trustScore: number;
  isBlocked: boolean;
  isDemo: boolean;
  isPaid?: boolean;
  createdAt: string;
  updatedAt: string;
}

export const authApi = {
  /**
   * Initiate OTP flow (email or phone).
   */
  sendOtp: async (identifier: string, type: 'email' | 'phone', name?: string, role?: string) => {
    const res = await authFetch('/api/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ identifier, type, name, role }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Failed to send OTP');
    }
    return res.json();
  },

  /**
   * Verify OTP — the backend will set the HttpOnly cookie on success.
   */
  verifyOtp: async (
    identifier: string,
    token: string,
    type: 'email' | 'phone'
  ): Promise<{ user: AuthUser; accessToken: string; refreshToken: string }> => {
    const res = await authFetch('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ identifier, token, type }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Invalid or expired OTP');
    }
    return res.json();
  },

  /**
   * Password sign in — backend sets HttpOnly cookie on success.
   */
  signIn: async (email: string, password: string): Promise<{ user: AuthUser; accessToken: string; refreshToken: string }> => {
    const res = await authFetch('/api/auth/sign-in', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Invalid email or password');
    }
    return res.json();
  },

  /**
   * Fetch the current session from the backend (validates cookie).
   * Returns null if unauthenticated.
   */
  getMe: async (): Promise<{ user: AuthUser; accessToken: string; refreshToken?: string } | null> => {
    try {
      const res = await authFetch('/api/auth/me');
      if (res.status === 401) return null;
      if (!res.ok) return null;
      const body = await res.json();
      if (!body.user) return null;
      return body;
    } catch {
      return null;
    }
  },

  /**
   * Logout — backend invalidates session and clears cookie.
   */
  logout: async () => {
    const res = await authFetch('/api/auth/logout', { method: 'POST' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Logout failed');
    }
    return res.json();
  },

  /**
   * Proactively refresh the access-token cookie using the refresh-token cookie.
   */
  refresh: async () => {
    const res = await authFetch('/api/auth/refresh', { method: 'POST' });
    return res.ok;
  },
};
