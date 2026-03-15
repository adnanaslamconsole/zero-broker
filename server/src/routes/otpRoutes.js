const express = require('express');
const router = express.Router();
const otpController = require('../controllers/otpController');
const { otpRateLimiter } = require('../middleware/rateLimiter');

// Send OTP Route (Rate Limited)
router.post('/send', otpRateLimiter, otpController.sendOTP);

// Verify OTP Route
router.post('/verify', otpController.verifyOTP);

module.exports = router;
