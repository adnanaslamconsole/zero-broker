const express = require('express');
const router = express.Router();
const seoController = require('../controllers/seoController');

router.get('/sitemap', seoController.getSitemap);

module.exports = router;
