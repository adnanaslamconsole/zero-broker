import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { UserAccountSnapshot, UserProfile } from '@/types/user';
import { toast } from 'sonner';
import { offlineStorage } from '@/lib/offlineStorage';

interface AuthContextValue {
  user: UserAccountSnapshot | null;
  isLoading: boolean;
  loginWithOtp: (identifier: string, type: 'email' | 'phone', name?: string, role?: string) => Promise<void>;
  verifyOtp: (identifier: string, token: string, type: 'email' | 'phone') => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserAccountSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (profile) {
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
      toast.error('Failed to load user profile');
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithOtp = async (identifier: string, type: 'email' | 'phone', name?: string, role?: string) => {
    setIsLoading(true);
    try {
      // Mock flow for demo/testing
      const isDemoUser = 
        identifier === 'dummy@zerobroker.in' || 
        identifier === '9999999999' || 
        identifier === 'paid-owner@demo.com';

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
        toast.success('OTP sent! (Use 123456 for demo)');
        return;
      }

      let error;
      if (type === 'email') {
        const { error: err } = await supabase.auth.signInWithOtp({
          email: identifier,
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
        const { error: err } = await supabase.auth.signInWithOtp({
          phone: identifier,
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
      const err = error as Error;
      toast.error(err.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (identifier: string, token: string, type: 'email' | 'phone') => {
    setIsLoading(true);
    try {
      // Mock verification for demo/testing
      const isDemoUser = 
        identifier === 'dummy@zerobroker.in' || 
        identifier === '9999999999' || 
        identifier === 'paid-owner@demo.com';

      if (isDemoUser && token === '123456') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Use different ID for paid demo owner to avoid seeing seeded public properties as their own
        const demoUserId = identifier === 'paid-owner@demo.com' 
          ? 'd0000000-0000-0000-0000-000000000001' 
          : '00000000-0000-0000-0000-000000000000';

        // Mock profile data directly to avoid RLS issues without session
        const mockProfile: UserProfile = {
          id: demoUserId,
          name: identifier === 'paid-owner@demo.com' ? 'Paid Demo Owner' : 'ZeroBroker Partner',
          email: type === 'email' ? identifier : undefined,
          mobile: type === 'phone' ? identifier : undefined,
          avatarUrl: null,
          roles: identifier === 'paid-owner@demo.com' ? ['owner'] : ['owner'],
          primaryRole: 'owner',
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
        
        // Sync offline draft for demo user
        offlineStorage.syncDraftWithUser(mockProfile.id);
        
        toast.success('Logged in successfully (Demo Mode)!');
        localStorage.removeItem('demo_user_meta');
        return;
      }

      let error;
      if (type === 'email') {
        const { error: err } = await supabase.auth.verifyOtp({
          email: identifier,
          token,
          type: 'email',
        });
        error = err;
      } else {
        const { error: err } = await supabase.auth.verifyOtp({
          phone: identifier,
          token,
          type: 'sms',
        });
        error = err;
      }

      if (error) throw error;
      toast.success('Logged in successfully!');
    } catch (error) {
      console.error('Verify error:', error);
      const err = error as Error;
      toast.error(err.message || 'Invalid OTP');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      const err = error as Error;
      toast.error(err.message || 'Failed to logout');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        loginWithOtp,
        verifyOtp,
        logout,
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

