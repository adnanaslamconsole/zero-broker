const AdminLog = require('../models/AdminLog');
const Property = require('../models/Property');
const Ticket = require('../models/Ticket');
const SystemSetting = require('../models/SystemSetting');
const { logAdminAction } = require('../utils/adminLogger');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('[AdminController] Supabase initialized. Service Role Key present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * GET /api/admin/logs
 * Fetch administrative activity logs with pagination and filters.
 */
exports.getAdminLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, action, adminId, targetType } = req.query;
    const filter = {};
    
    if (action) filter.action = action;
    if (adminId) filter.adminId = adminId;
    if (targetType) filter.targetType = targetType;

    const logs = await AdminLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await AdminLog.countDocuments(filter);

    res.json({
      logs,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalLogs: count
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin logs' });
  }
};

/**
 * POST /api/admin/users/:id/block
 * Block/Unblock a user and log the action.
 */
exports.toggleUserBlock = async (req, res) => {
  const { id } = req.params;
  const { isBlocked, reason } = req.body;

  try {
    // 1. Update in Supabase profiles table
    const { data, error } = await supabase
      .from('profiles')
      .update({ is_blocked: isBlocked })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // 2. Log Action
    await logAdminAction({
      adminId: req.user.id,
      adminName: req.user.profile.name,
      action: isBlocked ? 'BLOCK_USER' : 'UNBLOCK_USER',
      targetId: id,
      targetType: 'USER',
      details: { reason, userEmail: data.email },
      req
    });

    res.json({ message: `User ${isBlocked ? 'blocked' : 'unblocked'} successfully`, profile: data });
  } catch (err) {
    console.error('[AdminController] toggleUserBlock error:', err);
    res.status(500).json({ error: err.message || 'Failed to update user status' });
  }
};

/**
 * POST /api/admin/properties/:id/moderate
 * Approve/Reject a property listing and log the action.
 */
exports.moderateProperty = async (req, res) => {
  const { id } = req.params;
  const { status, remarks } = req.body; // status: 'approved' | 'rejected'

  try {
    // 1. Update in MongoDB
    const property = await Property.findByIdAndUpdate(
      id,
      { 
        verification_status: status,
        is_verified: status === 'approved',
        moderation_remarks: remarks,
        moderated_at: new Date(),
        moderated_by: req.user.id
      },
      { new: true }
    );

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // 2. Log Action
    await logAdminAction({
      adminId: req.user.id,
      adminName: req.user.profile.name,
      action: status === 'approved' ? 'APPROVE_LISTING' : 'REJECT_LISTING',
      targetId: id,
      targetType: 'PROPERTY',
      details: { remarks, propertyTitle: property.title },
      req
    });

    res.json({ message: `Property ${status} successfully`, property });
  } catch (err) {
    console.error('[AdminController] moderateProperty error:', err);
    res.status(500).json({ error: 'Failed to moderate property' });
  }
};

/**
 * GET /api/admin/tickets
 * Fetch support tickets with filters.
 */
exports.getTickets = async (req, res) => {
  try {
    const { status, priority, category } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;

    const tickets = await Ticket.find(filter).sort({ updatedAt: -1 });
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
};

/**
 * PATCH /api/admin/tickets/:id
 * Update ticket status or assign to admin.
 */
exports.updateTicket = async (req, res) => {
  const { id } = req.params;
  const { status, assignedTo, message } = req.body;

  try {
    const update = { status, assignedTo };
    if (message) {
      update.$push = {
        history: {
          senderId: req.user.id,
          message,
          isAdmin: true
        }
      };
    }

    const ticket = await Ticket.findByIdAndUpdate(id, update, { new: true });
    
    // Log action
    await logAdminAction({
      adminId: req.user.id,
      adminName: req.user.profile.name,
      action: 'UPDATE_SETTINGS', // Reusing an existing enum or we could add 'UPDATE_TICKET'
      targetId: id,
      targetType: 'TICKET',
      details: { status, messageSnippet: message?.slice(0, 50) },
      req
    });

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update ticket' });
  }
};

/**
 * GET /api/admin/settings
 */
exports.getSettings = async (req, res) => {
  try {
    const settings = await SystemSetting.find({});
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

/**
 * PATCH /api/admin/settings/:key
 */
exports.updateSetting = async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;

  try {
    const setting = await SystemSetting.findOneAndUpdate(
      { key },
      { value, updatedBy: req.user.id },
      { new: true, upsert: true }
    );

    // Log action
    await logAdminAction({
      adminId: req.user.id,
      adminName: req.user.profile.name,
      action: 'UPDATE_SETTINGS',
      targetId: key,
      targetType: 'SETTINGS',
      details: { newValue: value },
      req
    });

    res.json(setting);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update setting' });
  }
};

/**
 * POST /api/admin/users/:id/kyc
 * Update user KYC status and log action.
 */
exports.updateKycStatus = async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body; // status: 'verified' | 'rejected'

  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        kyc_status: status,
        kyc_rejection_reason: reason || null,
        trust_score: status === 'verified' ? 100 : 80
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log action
    await logAdminAction({
      adminId: req.user.id,
      adminName: req.user.profile.name,
      action: status === 'verified' ? 'UPDATE_USER' : 'BLOCK_USER', // Or add specific KYC actions to enum
      targetId: id,
      targetType: 'USER',
      details: { kycStatus: status, reason },
      req
    });

    res.json({ message: `KYC status updated to ${status}`, profile: data });
  } catch (err) {
    console.error('[AdminController] updateKycStatus error:', err);
    res.status(500).json({ error: 'Failed to update KYC status' });
  }
};
