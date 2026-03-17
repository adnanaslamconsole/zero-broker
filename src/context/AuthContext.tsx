import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { UserAccountSnapshot, UserProfile, VerificationStatus } from '@/types/user';
import { toast } from 'sonner';
import { offlineStorage } from '@/lib/offlineStorage';
import { getUserFriendlyErrorMessage, logError } from '@/lib/errors';
import { assertEmailNotDisposable, isValidEmail } from '@/lib/disposableEmailGuard';
import { abortAllRequests } from '@/lib/requestAbort';
import { queryClient } from '@/lib/queryClient';
import { VERSION_KEY, clearAllAppData } from '@/lib/cacheSync';

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
  // MFA methods
  enrollMfa: () => Promise<{ qrCode: string; secret: string }>;
  verifyAndEnableMfa: (code: string, factorId: string) => Promise<void>;
  unenrollMfa: (factorId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserAccountSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const fetchIdRef = useRef<string | null>(null);

  const patchLocalProfile = (patch: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const nextProfile: UserProfile = {
        ...prev.profile,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      if (prev.profile.isDemo) {
        localStorage.setItem('zerobroker-demo-session', JSON.stringify(nextProfile));
      }
      return { ...prev, profile: nextProfile };
    });
  };

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

  useEffect(() => {
    let mounted = true;

    // Check active session on mount
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (session?.user && mounted) {
          const fetchId = Math.random().toString(36).substring(7);
          fetchIdRef.current = fetchId;
          await fetchProfile(session.user.id, fetchId);
        } else if (mounted) {
          // Check for demo user session in localStorage
          const demoSession = localStorage.getItem('zerobroker-demo-session');
          if (demoSession) {
            const profile = JSON.parse(demoSession);
            setUser({
              profile,
              savedSearches: [],
              favorites: [],
              recentActivity: [],
            });
          }
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          // Clear cache on login to prevent stale data from anonymous/previous session
          if (event === 'SIGNED_IN') {
            queryClient.clear();
          }
          const fetchId = Math.random().toString(36).substring(7);
          fetchIdRef.current = fetchId;
          await fetchProfile(session.user.id, fetchId);
        } else {
          setIsLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        fetchIdRef.current = null;
        setUser(null);
        localStorage.removeItem('zerobroker-demo-session');
        setIsLoading(false);
      } else {
        // Handle all other events (USER_UPDATED, INITIAL_SESSION, PASSWORD_RECOVERY, etc.)
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string, fetchId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (profile && fetchIdRef.current === fetchId) {
        if (profile.is_blocked) {
          toast.error('Your account is blocked. Please contact support.');
          await supabase.auth.signOut();
          return;
        }
        // Transform DB profile to UserProfile type
        const userProfile: UserProfile = {
          id: profile.id,
          name: profile.name || 'User',
          email: profile.email,
          mobile: profile.mobile,
          avatarUrl: profile.avatar_url,
          roles: profile.roles || ['tenant'],
          primaryRole: profile.primary_role || 'tenant',
          kycStatus: profile.kyc_status || 'unverified',
          kycDocuments: [], // In a real app, fetch these separately
          trustScore: profile.trust_score || 0,
          isBlocked: profile.is_blocked || false,
          isDemo: profile.id === '00000000-0000-0000-0000-000000000000' || profile.id === 'd0000000-0000-0000-0000-000000000001',
          createdAt: profile.created_at,
          updatedAt: profile.updated_at,
        };

        setUser({
          profile: userProfile,
          savedSearches: [], // Fetch separately
          favorites: [], // Fetch separately
          recentActivity: [], // Fetch separately
        });

        // Sync offline draft if exists
        offlineStorage.syncDraftWithUser(profile.id);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      if (fetchIdRef.current === fetchId) {
        toast.error('Failed to load user profile');
      }
    } finally {
      if (fetchIdRef.current === fetchId) {
        setIsLoading(false);
      }
    }
  };

  const loginWithOtp = async (identifier: string, type: 'email' | 'phone', name?: string, role?: string) => {
    setIsLoading(true);
    try {
      // Mock flow for demo/testing
      const isDemoUser = 
        identifier === 'dummy@zerobroker.in' || 
        identifier === '9999999999' || 
        identifier === 'paid-owner@demo.com' ||
        identifier === 'admin@demo.com';

      if (isDemoUser) {
        // Store meta for demo verification step
        if (name || role || identifier === 'paid-owner@demo.com') {
          const meta = { 
            name: name || (identifier === 'paid-owner@demo.com' ? 'Paid Demo Owner' : undefined), 
            role: role || (identifier === 'paid-owner@demo.com' ? 'owner' : undefined),
            isPaid: identifier === 'paid-owner@demo.com'
          };
          localStorage.setItem('demo_user_meta', JSON.stringify(meta));
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        toast.success('OTP sent! (Use 12345678 for demo)');
        return;
      }

      let error;
      const cleanIdentifier = identifier.trim().toLowerCase();

      if (type === 'email') {
        if (isValidEmail(cleanIdentifier)) {
          await assertEmailNotDisposable(cleanIdentifier);
        }
        const { error: err } = await supabase.auth.signInWithOtp({
          email: cleanIdentifier,
          options: {
            shouldCreateUser: true,
            data: {
              name: name,
              role: role
            }
          },
        });
        error = err;
      } else {
        let phone = identifier;
        if (!phone.startsWith('+')) {
          phone = phone.startsWith('91') && phone.length === 12 ? `+${phone}` : `+91${phone}`;
        }
        const { error: err } = await supabase.auth.signInWithOtp({
          phone: phone,
          options: {
            shouldCreateUser: true,
            data: {
              name: name,
              role: role
            }
          },
        });
        error = err;
      }

      if (error) throw error;
      toast.success(`OTP sent to your ${type === 'email' ? 'email' : 'phone'}!`);
    } catch (error) {
      console.error('Login error:', error);
      logError(error, { action: 'auth.loginWithOtp' });
      toast.error(getUserFriendlyErrorMessage(error, { action: 'auth.loginWithOtp' }) || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          toast.error('Please verify your email before logging in.');
        } else if (error.message.includes('Invalid login credentials')) {
          await logSecurityEvent('login-failed', { email, reason: 'Invalid credentials' });
          toast.error('Invalid email or password.');
        } else {
          logError(error, { action: 'auth.signIn' });
          toast.error(getUserFriendlyErrorMessage(error, { action: 'auth.signIn' }));
        }
        throw error;
      }

      await logSecurityEvent('login-success', { email, userId: data.user?.id });
      toast.success('Logged in successfully!');
    } catch (error) {
      console.error('SignIn error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithOAuth = async (provider: 'google' | 'github') => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
      await logSecurityEvent('oauth-login-initiated', { provider });
    } catch (error) {
      console.error('OAuth error:', error);
      logError(error, { action: 'auth.signInWithOAuth' });
      toast.error(getUserFriendlyErrorMessage(error, { action: 'auth.signInWithOAuth' }));
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string, role: string = 'tenant') => {
    setIsLoading(true);
    try {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(password)) {
        throw new Error('Password must be at least 8 characters long, include an uppercase letter, a lowercase letter, a number, and a special character.');
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            primary_role: role,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      if (data.user) {
        await logSecurityEvent('registration-success', { email, userId: data.user.id });
        toast.success('Registration successful! Please check your email for verification.');
      }
    } catch (error) {
      console.error('SignUp error:', error);
      logError(error, { action: 'auth.signUp' });
      toast.error(getUserFriendlyErrorMessage(error, { action: 'auth.signUp' }));
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updatePassword = async (newPassword: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
      
      await logSecurityEvent('password-changed', { userId: user?.profile.id });
      toast.success('Password updated successfully!');
    } catch (error) {
      console.error('Update password error:', error);
      logError(error, { action: 'auth.updatePassword' });
      toast.error(getUserFriendlyErrorMessage(error, { action: 'auth.updatePassword' }));
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (payload: { name: string; mobile?: string | null }) => {
    if (!user) throw new Error('Not authenticated');

    const name = payload.name.trim();
    const rawMobile = payload.mobile?.trim() ?? '';
    const mobile = rawMobile.length > 0 ? rawMobile : null;

    if (name.length < 2) {
      throw new Error('Name must be at least 2 characters long');
    }

    if (mobile && !/^\+?\d{10,15}$/.test(mobile)) {
      throw new Error('Please enter a valid mobile number');
    }

    if (user.profile.isDemo) {
      patchLocalProfile({ name, mobile: mobile ?? undefined });
      return;
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!sessionData.session) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('profiles')
      .update({ name, mobile })
      .eq('id', user.profile.id);

    if (error) throw error;

    patchLocalProfile({ name, mobile: mobile ?? undefined });
  };

  const uploadAvatar = async (file: File) => {
    if (!user) throw new Error('Not authenticated');

    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    const maxBytes = 5 * 1024 * 1024;

    if (!allowedTypes.has(file.type)) {
      throw new Error('Please upload a JPG, PNG, or WEBP image');
    }
    if (file.size > maxBytes) {
      throw new Error('Image size must be 5MB or less');
    }

    if (user.profile.isDemo) {
      const dataUrl = await readFileAsDataUrl(file);
      patchLocalProfile({ avatarUrl: dataUrl });
      return dataUrl;
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!sessionData.session) throw new Error('Not authenticated');

    const ext = file.name.split('.').pop() || 'png';
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const filePath = `${user.profile.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const publicUrl = data.publicUrl;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.profile.id);

    if (updateError) throw updateError;

    patchLocalProfile({ avatarUrl: publicUrl });
    return publicUrl;
  };

  const logSecurityEvent = async (type: string, metadata: Record<string, unknown> & { email?: string; userId?: string }) => {
    if (!user && !metadata.email) return;
    
    try {
      await supabase.from('security_logs').insert({
        user_id: user?.profile.id || metadata.userId,
        event_type: type,
        metadata,
        ip_address: '0.0.0.0',
        user_agent: navigator.userAgent,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to log security event:', err);
    }
  };

  const enrollMfa = async () => {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
    });

    if (error) throw error;
    
    return {
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
      factorId: data.id,
    };
  };

  const verifyAndEnableMfa = async (code: string, factorId: string) => {
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });

    if (error) throw error;
    
    await logSecurityEvent('mfa-enabled', { factorId });
    toast.success('MFA enabled successfully!');
  };

  const unenrollMfa = async (factorId: string) => {
    const { error } = await supabase.auth.mfa.unenroll({
      factorId,
    });

    if (error) throw error;
    
    await logSecurityEvent('mfa-disabled', { factorId });
    toast.success('MFA disabled successfully!');
  };

  const verifyOtp = async (identifier: string, token: string, type: 'email' | 'phone') => {
    setIsLoading(true);
    try {
      // Mock verification for demo/testing
      const isDemoUser = 
        identifier === 'dummy@zerobroker.in' || 
        identifier === '9999999999' || 
        identifier === 'paid-owner@demo.com' ||
        identifier === 'admin@demo.com';

      if (isDemoUser && token === '12345678') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Use different ID for paid demo owner to avoid seeing seeded public properties as their own
        const demoUserId =
          identifier === 'paid-owner@demo.com'
            ? 'd0000000-0000-0000-0000-000000000001'
            : identifier === 'admin@demo.com'
              ? 'a0000000-0000-0000-0000-000000000001'
              : '00000000-0000-0000-0000-000000000000';

        // Mock profile data directly to avoid RLS issues without session
        const mockProfile: UserProfile = {
          id: demoUserId,
          name:
            identifier === 'paid-owner@demo.com'
              ? 'Paid Demo Owner'
              : identifier === 'admin@demo.com'
                ? 'Demo Admin'
                : 'ZeroBroker Partner',
          email: type === 'email' ? identifier : undefined,
          mobile: type === 'phone' ? identifier : undefined,
          avatarUrl: null,
          roles: identifier === 'admin@demo.com' ? ['platform-admin'] : ['owner'],
          primaryRole: identifier === 'admin@demo.com' ? 'platform-admin' : 'owner',
          kycStatus: 'verified',
          kycDocuments: [],
          trustScore: 100,
          isBlocked: false,
          isDemo: true, // Mark as demo user
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isPaid: identifier === 'paid-owner@demo.com' // Explicitly set paid status
        };

        // If specific name/role provided during login, use them for demo
        const demoUser = localStorage.getItem('demo_user_meta');
        if (demoUser) {
           const meta = JSON.parse(demoUser);
           mockProfile.name = meta.name || mockProfile.name;
           mockProfile.primaryRole = meta.role || mockProfile.primaryRole;
           mockProfile.roles = [meta.role || 'tenant'];
           if (meta.isPaid) mockProfile.isPaid = true;
        }

        setUser({
          profile: mockProfile,
          savedSearches: [],
          favorites: [],
          recentActivity: [],
        });
        
        // Persist demo session for reloads
        localStorage.setItem('zerobroker-demo-session', JSON.stringify(mockProfile));
        
        // Sync offline draft for demo user
        offlineStorage.syncDraftWithUser(mockProfile.id);
        
        toast.success('Logged in successfully (Demo Mode)!');
        localStorage.removeItem('demo_user_meta');
        return;
      }

      let error;
      const cleanIdentifier = identifier.trim().toLowerCase();

      if (type === 'email') {
        // Try magiclink first (standard for signInWithOtp)
        const { error: err } = await supabase.auth.verifyOtp({
          email: cleanIdentifier,
          token,
          type: 'magiclink',
        });
        
        if (err) {
          // If magiclink fails, it might be a new user signup confirmation
          const { error: signupErr } = await supabase.auth.verifyOtp({
            email: cleanIdentifier,
            token,
            type: 'signup',
          });
          
          if (signupErr) {
            // Some older or specific configurations might use 'email' type
            const { error: emailErr } = await supabase.auth.verifyOtp({
              email: cleanIdentifier,
              token,
              type: 'email',
            });
            
            if (emailErr) {
              // If all fail, return the most descriptive error
              error = err || signupErr || emailErr;
            } else {
              error = null;
            }
          } else {
            error = null;
          }
        } else {
          error = null;
        }
      } else {
        let phone = identifier;
        if (!phone.startsWith('+')) {
          phone = phone.startsWith('91') && phone.length === 12 ? `+${phone}` : `+91${phone}`;
        }
        const { error: err } = await supabase.auth.verifyOtp({
          phone: phone, // Phone numbers shouldn't be lowercased
          token,
          type: 'sms',
        });
        error = err;
      }

      if (error) throw error;
      toast.success('Logged in successfully!');
    } catch (error) {
      console.error('Verify error:', error);
      logError(error, { action: 'auth.verifyOtp' });
      toast.error(getUserFriendlyErrorMessage(error, { action: 'auth.verifyOtp' }) || 'Invalid OTP');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      setIsLoading(true);
      abortAllRequests();
      await queryClient.cancelQueries();

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      try {
        localStorage.clear();
        sessionStorage.clear();
        console.log('[Auth] localStorage and sessionStorage cleared successfully.');
      } catch (e) {
        console.warn('Full storage cleanup failed during logout', e);
      }

      queryClient.clear();
      setUser(null);
      toast.success('Logged out successfully');

      try {
        if (import.meta.env.MODE !== 'test') {
          window.location.assign('/login');
        }
      } catch {
        // ignore
      }
    } catch (error) {
      console.error('Logout error:', error);
      logError(error, { action: 'auth.logout' });
      toast.error(getUserFriendlyErrorMessage(error, { action: 'auth.logout' }) || 'Failed to logout');
    } finally {
      // Ensure loading is cleared regardless of outcome
      setIsLoading(false);
      setIsLoggingOut(false);
    }
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
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
