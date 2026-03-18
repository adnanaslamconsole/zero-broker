import { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { authApi, AuthUser } from '@/lib/authApi';
import type { VerificationStatus } from '@/types/user';
import { toast } from 'sonner';
import { offlineStorage } from '@/lib/offlineStorage';
import { getUserFriendlyErrorMessage, logError } from '@/lib/errors';
import { assertEmailNotDisposable, isValidEmail } from '@/lib/disposableEmailGuard';
import { abortAllRequests } from '@/lib/requestAbort';
import { queryClient } from '@/lib/queryClient';
import { clearAllAppData } from '@/lib/cacheSync';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  mobile?: string | null;
  avatarUrl?: string | null;
  roles: string[];
  primaryRole: string;
  kycStatus: string;
  kycDocuments: unknown[];
  trustScore: number;
  isBlocked: boolean;
  isDemo: boolean;
  isPaid?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserAccountSnapshot {
  profile: UserProfile;
  savedSearches: unknown[];
  favorites: unknown[];
  recentActivity: unknown[];
}

interface AuthContextValue {
  user: UserAccountSnapshot | null;
  isLoading: boolean;
  isLoggingOut: boolean;
  loginWithOtp: (identifier: string, type: 'email' | 'phone', name?: string, role?: string) => Promise<void>;
  verifyOtp: (identifier: string, token: string, type: 'email' | 'phone') => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'github') => Promise<void>;
  signUp: (email: string, password: string, name: string, role?: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  updateProfile: (payload: { name: string; mobile?: string | null }) => Promise<void>;
  updateKycStatus: (status: VerificationStatus) => void;
  uploadAvatar: (file: File) => Promise<string>;
  logout: () => Promise<void>;
  enrollMfa: () => Promise<{ qrCode: string; secret: string }>;
  verifyAndEnableMfa: (code: string, factorId: string) => Promise<void>;
  unenrollMfa: (factorId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function toUserAccount(authUser: AuthUser): UserAccountSnapshot {
  const profile: UserProfile = {
    id: authUser.id,
    name: authUser.name,
    email: authUser.email,
    mobile: authUser.mobile,
    avatarUrl: authUser.avatarUrl,
    roles: authUser.roles,
    primaryRole: authUser.primaryRole,
    kycStatus: authUser.kycStatus,
    kycDocuments: [],
    trustScore: authUser.trustScore,
    isBlocked: authUser.isBlocked,
    isDemo: authUser.isDemo,
    isPaid: authUser.isPaid,
    createdAt: authUser.createdAt,
    updatedAt: authUser.updatedAt,
  };
  return { profile, savedSearches: [], favorites: [], recentActivity: [] };
}

function buildDemoProfile(identifier: string, name?: string, role?: string, isPaid = false): UserProfile {
  const demoUserId =
    identifier === 'paid-owner@demo.com'
      ? 'd0000000-0000-0000-0000-000000000001'
      : identifier === 'admin@demo.com'
      ? 'a0000000-0000-0000-0000-000000000001'
      : '00000000-0000-0000-0000-000000000000';

  const defaultName =
    identifier === 'paid-owner@demo.com'
      ? 'Paid Demo Owner'
      : identifier === 'admin@demo.com'
      ? 'Demo Admin'
      : 'ZeroBroker Partner';

  const defaultRole = identifier === 'admin@demo.com' ? 'platform-admin' : 'owner';

  return {
    id: demoUserId,
    name: name || defaultName,
    email: identifier.includes('@') ? identifier : undefined,
    mobile: !identifier.includes('@') ? identifier : undefined,
    avatarUrl: null,
    roles: [role || defaultRole],
    primaryRole: role || defaultRole,
    kycStatus: 'verified',
    kycDocuments: [],
    trustScore: 100,
    isBlocked: false,
    isDemo: true,
    isPaid,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

const DEMO_IDENTIFIERS = new Set([
  'dummy@zerobroker.in',
  '9999999999',
  'paid-owner@demo.com',
  'admin@demo.com',
]);

// ------------------------------------------------------------------
// Provider
// ------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserAccountSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const mountedRef = useRef(true);
  // Store demo meta transiently in memory — NOT localStorage
  const demoMetaRef = useRef<{ name?: string; role?: string; isPaid?: boolean } | null>(null);

  // ----------------------------------------------------------------
  // Session restoration on mount via /api/auth/me
  // ----------------------------------------------------------------
  useEffect(() => {
    mountedRef.current = true;

    const restoreSession = async () => {
      try {
        // Try our secure backend session first (HttpOnly cookie)
        const result = await authApi.getMe();
        if (result && mountedRef.current) {
          const { user: authUser, accessToken, refreshToken } = result;
          if (authUser.isBlocked) {
            toast.error('Your account has been blocked. Please contact support.');
            await authApi.logout();
            return;
          }
          // Hydrate the Supabase SDK in-memory (no LocalStorage write) so
          // Storage, Realtime, and other SDK calls have an authenticated session.
          if (accessToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken ?? accessToken,
            }).catch(() => {});
          }
          setUser(toUserAccount(authUser));
          offlineStorage.syncDraftWithUser(authUser.id);
          return;
        }

        // No backend session — check for demo session in sessionStorage
        // (sessionStorage is cleared when the tab/browser closes; safer than localStorage)
        const demoSession = sessionStorage.getItem('zb-demo-session');
        if (demoSession && mountedRef.current) {
          try {
            const profile = JSON.parse(demoSession) as UserProfile;
            setUser({ profile, savedSearches: [], favorites: [], recentActivity: [] });
          } catch {
            sessionStorage.removeItem('zb-demo-session');
          }
        }
      } catch (err) {
        console.error('[AuthContext] Session restoration failed:', err);
      } finally {
        if (mountedRef.current) setIsLoading(false);
      }
    };

    restoreSession();

    // Listen for global 401 events (from appFetch interceptor)
    const handleUnauthorized = () => {
      console.warn('[AuthContext] Global 401 received — clearing session');
      setUser(null);
      sessionStorage.removeItem('zb-demo-session');
      toast.error('Your session has expired. Please log in again.');
      window.location.assign('/login');
    };
    window.addEventListener('auth-unauthorized', handleUnauthorized);

    // Proactive refresh: try to refresh the access-token every 20 minutes
    const refreshInterval = setInterval(async () => {
      if (!mountedRef.current || !user) return;
      await authApi.refresh().catch(() => {});
    }, 20 * 60 * 1000);

    return () => {
      mountedRef.current = false;
      window.removeEventListener('auth-unauthorized', handleUnauthorized);
      clearInterval(refreshInterval);
    };
  }, []);

  // ----------------------------------------------------------------
  // patchLocalProfile — in-memory profile updates
  // ----------------------------------------------------------------
  const patchLocalProfile = (patch: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const nextProfile: UserProfile = { ...prev.profile, ...patch, updatedAt: new Date().toISOString() };
      if (nextProfile.isDemo) {
        sessionStorage.setItem('zb-demo-session', JSON.stringify(nextProfile));
      }
      return { ...prev, profile: nextProfile };
    });
  };

  // ----------------------------------------------------------------
  // loginWithOtp — initiate OTP
  // ----------------------------------------------------------------
  const loginWithOtp = async (
    identifier: string,
    type: 'email' | 'phone',
    name?: string,
    role?: string
  ) => {
    setIsLoading(true);
    try {
      if (DEMO_IDENTIFIERS.has(identifier)) {
        // Store demo meta in memory only
        demoMetaRef.current = {
          name,
          role,
          isPaid: identifier === 'paid-owner@demo.com',
        };
        await new Promise((r) => setTimeout(r, 800));
        toast.success('OTP sent! (Use 12345678 for demo)');
        return;
      }

      const cleanIdentifier = identifier.trim().toLowerCase();
      if (type === 'email' && isValidEmail(cleanIdentifier)) {
        await assertEmailNotDisposable(cleanIdentifier);
      }

      await authApi.sendOtp(cleanIdentifier, type, name, role);
      toast.success(`OTP sent to your ${type === 'email' ? 'email' : 'phone'}!`);
    } catch (err) {
      logError(err, { action: 'auth.loginWithOtp' });
      toast.error(getUserFriendlyErrorMessage(err, { action: 'auth.loginWithOtp' }) || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------------------------------------------------------
  // verifyOtp — complete OTP flow and obtain session cookie
  // ----------------------------------------------------------------
  const verifyOtp = async (identifier: string, token: string, type: 'email' | 'phone') => {
    setIsLoading(true);
    try {
      if (DEMO_IDENTIFIERS.has(identifier) && token === '12345678') {
        await new Promise((r) => setTimeout(r, 800));
        const meta = demoMetaRef.current;
        const profile = buildDemoProfile(identifier, meta?.name, meta?.role, meta?.isPaid);
        demoMetaRef.current = null;

        setUser({ profile, savedSearches: [], favorites: [], recentActivity: [] });
        sessionStorage.setItem('zb-demo-session', JSON.stringify(profile));
        offlineStorage.syncDraftWithUser(profile.id);
        toast.success('Logged in successfully (Demo Mode)!');
        return;
      }

      const { user: authUser, accessToken, refreshToken } = await authApi.verifyOtp(identifier.trim(), token, type);
      // Hydrate Supabase SDK in-memory for Storage, Realtime, etc.
      if (accessToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken ?? accessToken,
        }).catch(() => {});
      }
      queryClient.clear();
      setUser(toUserAccount(authUser));
      offlineStorage.syncDraftWithUser(authUser.id);
      toast.success('Logged in successfully!');
    } catch (err) {
      logError(err, { action: 'auth.verifyOtp' });
      toast.error(getUserFriendlyErrorMessage(err, { action: 'auth.verifyOtp' }) || 'Invalid OTP');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------------------------------------------------------
  // signIn — email + password
  // ----------------------------------------------------------------
  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { user: authUser, accessToken, refreshToken } = await authApi.signIn(email, password);
      // Hydrate Supabase SDK in-memory for Storage, Realtime, etc.
      if (accessToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken ?? accessToken,
        }).catch(() => {});
      }
      queryClient.clear();
      setUser(toUserAccount(authUser));
      offlineStorage.syncDraftWithUser(authUser.id);
      toast.success('Logged in successfully!');
    } catch (err) {
      logError(err, { action: 'auth.signIn' });
      const message = (err as Error).message;
      if (message?.includes('Invalid email or password') || message?.includes('Invalid login credentials')) {
        toast.error('Invalid email or password.');
      } else {
        toast.error(getUserFriendlyErrorMessage(err, { action: 'auth.signIn' }));
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------------------------------------------------------
  // signInWithOAuth — delegated to Supabase (returns redirect)
  // ----------------------------------------------------------------
  const signInWithOAuth = async (provider: 'google' | 'github') => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (err) {
      logError(err, { action: 'auth.signInWithOAuth' });
      toast.error(getUserFriendlyErrorMessage(err, { action: 'auth.signInWithOAuth' }));
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------------------------------------------------------
  // signUp — delegates to Supabase, no self-storage
  // ----------------------------------------------------------------
  const signUp = async (email: string, password: string, name: string, role = 'tenant') => {
    setIsLoading(true);
    try {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(password)) {
        throw new Error(
          'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.'
        );
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, primary_role: role },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      if (data.user) {
        toast.success('Registration successful! Please check your email for verification.');
      }
    } catch (err) {
      logError(err, { action: 'auth.signUp' });
      toast.error(getUserFriendlyErrorMessage(err, { action: 'auth.signUp' }));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------------------------------------------------------
  // updatePassword
  // ----------------------------------------------------------------
  const updatePassword = async (newPassword: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Password updated successfully!');
    } catch (err) {
      logError(err, { action: 'auth.updatePassword' });
      toast.error(getUserFriendlyErrorMessage(err, { action: 'auth.updatePassword' }));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------------------------------------------------------
  // updateProfile
  // ----------------------------------------------------------------
  const updateProfile = async (payload: { name: string; mobile?: string | null }) => {
    if (!user) throw new Error('Not authenticated');
    const name = payload.name.trim();
    const mobile = payload.mobile?.trim() || null;

    if (name.length < 2) throw new Error('Name must be at least 2 characters');
    if (mobile && !/^\+?\d{10,15}$/.test(mobile)) throw new Error('Invalid mobile number');

    if (user.profile.isDemo) {
      patchLocalProfile({ name, mobile: mobile ?? undefined });
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ name, mobile })
      .eq('id', user.profile.id);

    if (error) throw error;
    patchLocalProfile({ name, mobile: mobile ?? undefined });
  };

  // ----------------------------------------------------------------
  // uploadAvatar
  // ----------------------------------------------------------------
  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

  const uploadAvatar = async (file: File) => {
    if (!user) throw new Error('Not authenticated');
    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!allowedTypes.has(file.type)) throw new Error('Please upload a JPG, PNG, or WEBP image');
    if (file.size > 5 * 1024 * 1024) throw new Error('Image size must be 5 MB or less');

    if (user.profile.isDemo) {
      const dataUrl = await readFileAsDataUrl(file);
      patchLocalProfile({ avatarUrl: dataUrl });
      return dataUrl;
    }

    const ext = file.name.split('.').pop() || 'png';
    const filePath = `${user.profile.id}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const publicUrl = data.publicUrl;

    const { error } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.profile.id);
    if (error) throw error;

    patchLocalProfile({ avatarUrl: publicUrl });
    return publicUrl;
  };

  // ----------------------------------------------------------------
  // logout
  // ----------------------------------------------------------------
  const logout = useCallback(async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      setIsLoading(true);
      abortAllRequests();
      await queryClient.cancelQueries();

      // Invalidate server-side session and clear cookie
      await authApi.logout().catch((err) => console.warn('[Auth] logout error (non-critical):', err));

      // Clear non-auth app data
      try {
        clearAllAppData();
      } catch (e) {
        console.warn('[Auth] clearAllAppData failed:', e);
      }

      // Clear demo session from sessionStorage
      sessionStorage.removeItem('zb-demo-session');

      queryClient.clear();
      setUser(null);
      toast.success('Logged out successfully');

      if (import.meta.env.MODE !== 'test') {
        window.location.assign('/login');
      }
    } catch (err) {
      logError(err, { action: 'auth.logout' });
      toast.error(getUserFriendlyErrorMessage(err, { action: 'auth.logout' }) || 'Failed to logout');
    } finally {
      setIsLoading(false);
      setIsLoggingOut(false);
    }
  }, [isLoggingOut]);

  // ----------------------------------------------------------------
  // MFA
  // ----------------------------------------------------------------
  const enrollMfa = async () => {
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
    if (error) throw error;
    return { qrCode: data.totp.qr_code, secret: data.totp.secret };
  };

  const verifyAndEnableMfa = async (code: string, factorId: string) => {
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    if (error) throw error;
    toast.success('MFA enabled successfully!');
  };

  const unenrollMfa = async (factorId: string) => {
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) throw error;
    toast.success('MFA disabled successfully!');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isLoggingOut,
        loginWithOtp,
        verifyOtp,
        signIn,
        signInWithOAuth,
        signUp,
        updatePassword,
        updateProfile,
        updateKycStatus: (status) => patchLocalProfile({ kycStatus: status }),
        uploadAvatar,
        logout,
        enrollMfa,
        verifyAndEnableMfa,
        unenrollMfa,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
