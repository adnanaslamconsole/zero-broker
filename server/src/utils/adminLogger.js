const AdminLog = require('../models/AdminLog');

/**
 * Utility to log administrative actions.
 * 
 * @param {Object} params
 * @param {string} params.adminId - Supabase ID of the admin
 * @param {string} params.adminName - Name of the admin
 * @param {string} params.action - Action constant (e.g., 'BLOCK_USER')
 * @param {string} params.targetId - ID of the affected record
 * @param {string} params.targetType - Type of target ('USER', 'PROPERTY', etc.)
 * @param {Object} params.details - Additional metadata
 * @param {Object} params.req - Express request object (optional, for IP/UA)
 */
async function logAdminAction({ 
  adminId, 
  adminName, 
  action, 
  targetId, 
  targetType, 
  details = {}, 
  req = null 
}) {
  try {
    const logEntry = new AdminLog({
      adminId,
      adminName,
      action,
      targetId,
      targetType,
      details,
      ip: req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : 'SYSTEM',
      userAgent: req ? req.headers['user-agent'] : 'SYSTEM',
    });

    await logEntry.save();
    console.log(`[AdminLog] ${adminName} (${adminId}) performed ${action} on ${targetType}:${targetId}`);
  } catch (err) {
    console.error('[AdminLogger] Failed to save log entry:', err);
    // Don't throw - we don't want to break the main action if logging fails
  }
}

module.exports = { logAdminAction };
