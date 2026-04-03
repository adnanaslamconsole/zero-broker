const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  price: Number,
  type: { type: String, enum: ['rent', 'sale', 'pg', 'commercial'], default: 'rent' },
  propertyCategory: { type: String, enum: ['apartment', 'villa', 'independent-house', 'pg', 'commercial', 'plot', 'office', 'shop'], default: 'apartment' },
  address: { type: String, required: true },
  // Normalized city for querying
  city: { 
    type: String, 
    lowercase: true, 
    trim: true, 
    index: true // Standard B-tree index for prefix/regex
  },
  state: { type: String, lowercase: true, trim: true },
  bedrooms: Number,
  bathrooms: Number,
  area: Number,
  images: [String],
  isAvailable: { type: Boolean, default: true },
  ownerId: { type: String, required: true }, // Linking to Supabase User ID or local user
}, { timestamps: true });

// Full-text index for broader search
propertySchema.index({ title: 'text', description: 'text', address: 'text' });

// Composite indexes for performance
propertySchema.index({ isAvailable: 1, type: 1, city: 1 });
propertySchema.index({ isAvailable: 1, price: 1 });
propertySchema.index({ isAvailable: 1, propertyCategory: 1 });
propertySchema.index({ createdAt: -1 });

module.exports = mongoose.model('Property', propertySchema);
