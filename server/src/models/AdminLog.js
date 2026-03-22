const mongoose = require('mongoose');

const adminLogSchema = new mongoose.Schema({
  adminId: {
    type: String, // Supabase User ID
    required: true,
    index: true,
  },
  adminName: String,
  action: {
    type: String,
    required: true,
    enum: ['LOGIN', 'LOGOUT', 'BLOCK_USER', 'UNBLOCK_USER', 'APPROVE_LISTING', 'REJECT_LISTING', 'UPDATE_SETTINGS', 'DELETE_LISTING', 'UPDATE_USER'],
  },
  targetId: String, // ID of the user/listing/record affected
  targetType: {
    type: String,
    enum: ['USER', 'PROPERTY', 'SETTINGS', 'TICKET', 'TRANSACTION'],
  },
  details: mongoose.Schema.Types.Mixed,
  ip: String,
  userAgent: String,
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

module.exports = mongoose.model('AdminLog', adminLogSchema);
