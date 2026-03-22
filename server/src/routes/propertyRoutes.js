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
    const { q, type, property } = req.query;
    
    // Default search criteria
    let query = { isAvailable: true };

    // 1. Location Search (City Normalization + Broad Match)
    if (q) {
      const cityToSearch = normalizeCity(q);
      
      query.$or = [
        { city: { $regex: cityToSearch, $options: 'i' } },
        { address: { $regex: q, $options: 'i' } },
        { title: { $regex: q, $options: 'i' } }
      ];
    }

    // 2. Listing Type Filter (rent/sale)
    if (type) {
      query.type = type.toLowerCase();
    }

    // 3. Property Category Filter (apartment/villa/pg/commercial)
    if (property) {
      query.propertyCategory = property.toLowerCase();
    }

    const properties = await Property.find(query)
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      count: properties.length,
      params: { q, type, property, normalizedCity: q ? normalizeCity(q) : null },
      data: properties
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Server error during property search',
      message: err.message 
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
