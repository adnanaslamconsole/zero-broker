const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  userId: {
    type: String, // Supabase User ID
    required: true,
    index: true,
  },
  subject: {
    type: String,
    required: true,
  },
  description: String,
  category: {
    type: String,
    enum: ['TECHNICAL', 'BILLING', 'DISPUTE', 'FEEDBACK', 'OTHER'],
    default: 'OTHER',
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    default: 'MEDIUM',
  },
  status: {
    type: String,
    enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
    default: 'OPEN',
  },
  assignedTo: String, // Admin User ID
  history: [
    {
      senderId: String,
      message: String,
      timestamp: { type: Date, default: Date.now },
      isAdmin: Boolean,
    }
  ],
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

module.exports = mongoose.model('Ticket', ticketSchema);
