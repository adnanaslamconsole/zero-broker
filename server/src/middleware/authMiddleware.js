const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const COOKIE_NAME = 'zb_session';

/**
 * Middleware to authenticate requests using the HttpOnly session cookie.
 * Attaches the authenticated user and their profile to req.user.
 */
const authenticate = async (req, res, next) => {
  const token = req.cookies?.[COOKIE_NAME];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // 1. Verify token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    // 2. Fetch full profile including roles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[AuthMiddleware] Profile fetch error:', profileError);
      return res.status(500).json({ error: 'Failed to load user profile' });
    }

    // 3. Attach to request
    req.user = {
      ...user,
      profile: {
        ...profile,
        roles: profile.roles || ['tenant'],
        primaryRole: profile.primary_role || 'tenant',
      }
    };

    next();
  } catch (err) {
    console.error('[AuthMiddleware] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error during authentication' });
  }
};

module.exports = { authenticate };
