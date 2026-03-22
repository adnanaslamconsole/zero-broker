const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  value: mongoose.Schema.Types.Mixed,
  description: String,
  category: {
    type: String,
    enum: ['GENERAL', 'AUTH', 'PAYMENT', 'MAINTENANCE', 'MARKETING', 'FRAUD'],
    default: 'GENERAL',
  },
  updatedBy: String, // Admin User ID
}, { timestamps: true });

module.exports = mongoose.model('SystemSetting', systemSettingSchema);
