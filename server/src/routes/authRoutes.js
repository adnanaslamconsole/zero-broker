const express = require('express');
const router = express.Router();
const {
  sendAuthOtp,
  verifyAuthOtp,
  signIn,
  getMe,
  logout,
  refreshSession,
} = require('../controllers/authController');

// Send OTP (email or phone)
router.post('/send-otp', sendAuthOtp);

// Verify OTP and create session (returns HttpOnly cookie)
router.post('/verify-otp', verifyAuthOtp);

// Password-based sign in
router.post('/sign-in', signIn);

// Get current session (validates cookie server-side)
router.get('/me', getMe);

// Logout: invalidate session + clear cookie
router.post('/logout', logout);

// Refresh access token using refresh cookie
router.post('/refresh', refreshSession);

module.exports = router;
