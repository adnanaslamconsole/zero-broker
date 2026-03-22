/**
 * Middleware to enforce Role-Based Access Control (RBAC).
 * Must be used AFTER authenticate middleware.
 * 
 * @param {string[]} allowedRoles - Array of roles allowed to access the route.
 */
const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.profile) {
      return res.status(401).json({ error: 'Authentication required for RBAC' });
    }

    const userRoles = req.user.profile.roles || [];
    const primaryRole = req.user.profile.primaryRole;

    // Check if user has at least one of the allowed roles
    const hasPermission = allowedRoles.some(role => 
      userRoles.includes(role) || primaryRole === role
    );

    if (!hasPermission) {
      console.warn(`[RBAC] Access Denied for User ${req.user.id}. Required: [${allowedRoles}], Had: [${userRoles}]`);
      return res.status(403).json({ 
        error: 'Forbidden: You do not have permission to perform this action',
        requiredRoles: allowedRoles
      });
    }

    next();
  };
};

// Pre-defined role shortcuts
const isSuperAdmin = checkRole(['super-admin', 'platform-admin']);
const isModerator = checkRole(['super-admin', 'platform-admin', 'moderator']);
const isSupport = checkRole(['super-admin', 'platform-admin', 'moderator', 'support']);

module.exports = { checkRole, isSuperAdmin, isModerator, isSupport };
