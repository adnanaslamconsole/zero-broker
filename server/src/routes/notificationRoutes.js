const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/authMiddleware');

/**
 * All notification routes require authentication
 */
router.use(authenticate);

// Booking notifications
router.post('/notify-booking', notificationController.notifyBooking);

module.exports = router;
