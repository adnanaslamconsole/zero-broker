const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const COOKIE_NAME = 'zb_session';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 7 * 1000, // 7 days in ms
  path: '/',
};

/**
 * POST /api/auth/send-otp
 * Initiates OTP flow via Supabase (email or phone).
 */
const sendAuthOtp = async (req, res) => {
  const { identifier, type, name, role } = req.body;

  if (!identifier || !type) {
    return res.status(400).json({ error: 'identifier and type are required' });
  }

  try {
    let error;
    const cleanIdentifier = identifier.trim();

    if (type === 'email') {
      const { error: err } = await supabaseAdmin.auth.signInWithOtp({
        email: cleanIdentifier.toLowerCase(),
        options: {
          shouldCreateUser: true,
          data: { name, role },
        },
      });
      error = err;
    } else {
      // Phone: use Supabase signInWithOtp (admin-init)
      const { error: err } = await supabaseAdmin.auth.signInWithOtp({
        phone: cleanIdentifier.startsWith('+') ? cleanIdentifier : `+91${cleanIdentifier}`,
        options: {
          shouldCreateUser: true,
          data: { name, role },
        },
      });
      error = err;
    }

    if (error) throw error;

    return res.status(200).json({ message: `OTP sent to your ${type}` });
  } catch (err) {
    console.error('[Auth] sendAuthOtp error:', err);
    return res.status(500).json({ error: err.message || 'Failed to send OTP' });
  }
};

/**
 * POST /api/auth/verify-otp
 * Verifies the OTP, creates a session, and sets HttpOnly cookie.
 */
const verifyAuthOtp = async (req, res) => {
  const { identifier, token, type } = req.body;

  if (!identifier || !token || !type) {
    return res.status(400).json({ error: 'identifier, token, and type are required' });
  }

  try {
    let session = null;

    if (type === 'email') {
      const cleanEmail = identifier.trim().toLowerCase();
      // Try magiclink, then signup, then email types
      for (const otpType of ['magiclink', 'signup', 'email']) {
        const { data, error } = await supabaseAdmin.auth.verifyOtp({
          email: cleanEmail,
          token,
          type: otpType,
        });
        if (!error && data?.session) {
          session = data.session;
          break;
        }
      }
    } else {
      const phone = identifier.startsWith('+') ? identifier : `+91${identifier}`;
      const { data, error } = await supabaseAdmin.auth.verifyOtp({
        phone,
        token,
        type: 'sms',
      });
      if (!error && data?.session) {
        session = data.session;
      }
    }

    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      return res.status(500).json({ error: 'Failed to load user profile' });
    }

    // Set HttpOnly session cookie with the Supabase access token
    res.cookie(COOKIE_NAME, session.access_token, COOKIE_OPTIONS);
    
    // Also store refresh token in a separate HttpOnly cookie
    res.cookie(`${COOKIE_NAME}_refresh`, session.refresh_token, {
      ...COOKIE_OPTIONS,
      maxAge: 60 * 60 * 24 * 30 * 1000, // 30 days for refresh token
    });

    return res.status(200).json({
      message: 'Logged in successfully',
      user: buildUserProfile(session.user, profile),
      accessToken: session.access_token, // for in-memory Supabase SDK hydration only
      refreshToken: session.refresh_token,
    });
  } catch (err) {
    console.error('[Auth] verifyAuthOtp error:', err);
    return res.status(500).json({ error: err.message || 'Verification failed' });
  }
};

/**
 * POST /api/auth/sign-in
 * Password-based sign in; sets HttpOnly cookie on success.
 */
const signIn = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const { session, user } = data;
    if (!session) {
      return res.status(401).json({ error: 'Authentication failed' });
    }

    // Fetch profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    res.cookie(COOKIE_NAME, session.access_token, COOKIE_OPTIONS);
    res.cookie(`${COOKIE_NAME}_refresh`, session.refresh_token, {
      ...COOKIE_OPTIONS,
      maxAge: 60 * 60 * 24 * 30 * 1000,
    });

    return res.status(200).json({
      message: 'Logged in successfully',
      user: buildUserProfile(user, profile),
      accessToken: session.access_token, // for in-memory Supabase SDK hydration only
      refreshToken: session.refresh_token,
    });
  } catch (err) {
    console.error('[Auth] signIn error:', err);
    const message = err.message?.includes('Invalid login credentials')
      ? 'Invalid email or password'
      : err.message || 'Sign in failed';
    return res.status(401).json({ error: message });
  }
};

/**
 * GET /api/auth/me
 * Validates the session cookie and returns the current user profile.
 */
const getMe = async (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      // Try to refresh using the refresh token cookie
      const refreshToken = req.cookies?.[`${COOKIE_NAME}_refresh`];
      if (refreshToken) {
        const { data: refreshData, error: refreshError } = await supabaseAdmin.auth.refreshSession({
          refresh_token: refreshToken,
        });

        if (!refreshError && refreshData.session) {
          // Rotate the access token cookie
          res.cookie(COOKIE_NAME, refreshData.session.access_token, COOKIE_OPTIONS);
          
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', refreshData.user.id)
            .single();

          return res.status(200).json({
            user: buildUserProfile(refreshData.user, profile),
            accessToken: refreshData.session.access_token,
            refreshToken: refreshData.session.refresh_token,
          });
        }
      }

      // Clear invalid cookies
      clearSessionCookies(res);
      return res.status(401).json({ error: 'Session expired' });
    }

    // Fetch profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return res.status(200).json({
      user: buildUserProfile(user, profile),
      accessToken: token, // current access token for SDK hydration
    });
  } catch (err) {
    console.error('[Auth] getMe error:', err);
    clearSessionCookies(res);
    return res.status(401).json({ error: 'Session validation failed' });
  }
};

/**
 * POST /api/auth/logout
 * Invalidates the Supabase session and clears the session cookie.
 */
const logout = async (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];

  try {
    if (token) {
      // Invalidate session server-side
      await supabaseAdmin.auth.admin.signOut(token, 'global');
    }
  } catch (err) {
    console.warn('[Auth] logout session invalidation error (non-critical):', err?.message);
  } finally {
    clearSessionCookies(res);
    return res.status(200).json({ message: 'Logged out successfully' });
  }
};

/**
 * POST /api/auth/refresh
 * Proactively refreshes the access token using the refresh cookie.
 */
const refreshSession = async (req, res) => {
  const refreshToken = req.cookies?.[`${COOKIE_NAME}_refresh`];

  if (!refreshToken) {
    return res.status(401).json({ error: 'No refresh token' });
  }

  try {
    const { data, error } = await supabaseAdmin.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session) throw error;

    res.cookie(COOKIE_NAME, data.session.access_token, COOKIE_OPTIONS);

    return res.status(200).json({ message: 'Session refreshed' });
  } catch (err) {
    clearSessionCookies(res);
    return res.status(401).json({ error: 'Session refresh failed' });
  }
};

// --- Helpers ---

function clearSessionCookies(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.clearCookie(`${COOKIE_NAME}_refresh`, { path: '/' });
}

function buildUserProfile(user, profile) {
  return {
    id: user.id,
    email: user.email,
    name: profile?.name || user.user_metadata?.name || 'User',
    mobile: profile?.mobile || null,
    avatarUrl: profile?.avatar_url || null,
    roles: profile?.roles || ['tenant'],
    primaryRole: profile?.primary_role || 'tenant',
    kycStatus: profile?.kyc_status || 'unverified',
    trustScore: profile?.trust_score || 0,
    isBlocked: profile?.is_blocked || false,
    isDemo: false,
    isPaid: profile?.is_paid || false,
    createdAt: profile?.created_at || user.created_at,
    updatedAt: profile?.updated_at || user.updated_at,
  };
}

module.exports = { sendAuthOtp, verifyAuthOtp, signIn, getMe, logout, refreshSession };
