const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/authMiddleware');
const { paymentLimiter } = require('../middleware/rateLimiter');

/**
 * All payment routes require authentication
 */
router.use(authenticate);

// Razorpay Order Creation
router.post('/create-order', paymentLimiter, paymentController.createOrder);

// Payment Verification
router.post('/verify', paymentController.verifyPayment);

module.exports = router;
