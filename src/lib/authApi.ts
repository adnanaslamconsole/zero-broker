/**
 * authApi.ts
 *
 * Production-ready API client for /api/auth/*
 * - Uses HttpOnly cookies (secure)
 * - Works with Netlify (frontend) + Render (backend)
 * - Handles errors + network failures cleanly
 */

const BASE_URL =
  (import.meta.env.VITE_AUTH_SERVER_URL as string)?.replace(/\/$/, "") ||
  "http://localhost:3000" ||
  "https://zerobrokerapp.netlify.app";

/**
 * Generic fetch wrapper with error handling
 */
async function authFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      credentials: "include", // required for cookies
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });

    return res;
  } catch (error) {
    console.error("Network error:", error);
    throw new Error("Network error. Please check your connection.");
  }
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
   * Send OTP (email or phone)
   */
  async sendOtp(
    identifier: string,
    type: "email" | "phone",
    name?: string,
    role?: string,
  ) {
    const res = await authFetch("/api/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({ identifier, type, name, role }),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(body?.error || "Failed to send OTP");
    }

    return body;
  },

  /**
   * Verify OTP
   */
  async verifyOtp(
    identifier: string,
    token: string,
    type: "email" | "phone",
  ): Promise<{ user: AuthUser; accessToken: string; refreshToken: string }> {
    const res = await authFetch("/api/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ identifier, token, type }),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(body?.error || "Invalid or expired OTP");
    }

    return body;
  },

  /**
   * Email + password login
   */
  async signIn(
    email: string,
    password: string,
  ): Promise<{ user: AuthUser; accessToken: string; refreshToken: string }> {
    const res = await authFetch("/api/auth/sign-in", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(body?.error || "Invalid email or password");
    }

    return body;
  },

  /**
   * Get current authenticated user
   */
  async getMe(): Promise<{
    user: AuthUser;
    accessToken: string;
    refreshToken?: string;
  } | null> {
    try {
      const res = await authFetch("/api/auth/me");

      if (res.status === 401) return null;
      if (!res.ok) return null;

      const body = await res.json().catch(() => ({}));

      return body?.user ? body : null;
    } catch (error) {
      console.error("getMe error:", error);
      return null;
    }
  },

  /**
   * Logout user
   */
  async logout() {
    const res = await authFetch("/api/auth/logout", {
      method: "POST",
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(body?.error || "Logout failed");
    }

    return body;
  },

  /**
   * Refresh session using refresh cookie
   */
  async refresh(): Promise<boolean> {
    try {
      const res = await authFetch("/api/auth/refresh", {
        method: "POST",
      });

      return res.ok;
    } catch (error) {
      console.error("refresh error:", error);
      return false;
    }
  },
};
