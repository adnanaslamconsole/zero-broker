const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const { normalizeCity } = require('../utils/locationHelper');

/**
 * @route   GET /api/properties/search
 * @desc    Search properties by city (normalized and case-insensitive)
 * @access  Public
 */
router.get('/search', async (req, res) => {
  try {
    const { q, type, property, minPrice, maxPrice, page = 1, limit = 10 } = req.query;
    
    // 1. Sanitization & Input Processing
    const pageSize = Math.min(parseInt(limit), 50); // Cap limit at 50
    const skip = (parseInt(page) - 1) * pageSize;
    const searchArea = q ? q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : null; // Sanitize regex

    // 2. Build Query
    let query = { isAvailable: true };

    if (searchArea) {
      const cityToSearch = normalizeCity(searchArea);
      query.$or = [
        { city: { $regex: cityToSearch, $options: 'i' } },
        { address: { $regex: searchArea, $options: 'i' } },
        { title: { $regex: searchArea, $options: 'i' } }
      ];
    }

    if (type) query.type = type.toLowerCase();
    if (property) query.propertyCategory = property.toLowerCase();

    // Price Filtering
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseInt(minPrice);
      if (maxPrice) query.price.$lte = parseInt(maxPrice);
    }

    // 3. Execute with Pagination
    const [properties, total] = await Promise.all([
      Property.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize),
      Property.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: properties,
      pagination: {
        total,
        page: parseInt(page),
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize)
      },
      meta: {
        query: q,
        normalizedCity: searchArea ? normalizeCity(searchArea) : null
      }
    });
  } catch (err) {
    console.error('Production Search Error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'An unexpected error occurred during search. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

/**
 * @route   POST /api/properties
 * @desc    Create a new property listing (with normalization)
 * @access  Private (Needs auth middleware in production)
 */
router.post('/', async (req, res) => {
  try {
    const propertyData = req.body;
    
    // Normalize city before saving
    if (propertyData.address) {
      propertyData.city = normalizeCity(propertyData.address);
    }

    const newProperty = new Property(propertyData);
    const savedProperty = await newProperty.save();
    
    res.status(201).json({
      success: true,
      data: savedProperty
    });
  } catch (err) {
    res.status(400).json({ 
      success: false, 
      error: 'Failed to create property listing',
      message: err.message 
    });
  }
});

module.exports = router;
