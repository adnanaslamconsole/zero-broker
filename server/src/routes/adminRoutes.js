const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate } = require('../middleware/authMiddleware');
const { isModerator, isSuperAdmin, isSupport } = require('../middleware/rbacMiddleware');

// All routes here require authentication and at least Moderator role
router.use(authenticate);

/**
 * Activity Logs
 */
router.get('/logs', isModerator, adminController.getAdminLogs);

/**
 * User Management (God Mode)
 */
router.post('/users/:id/block', isModerator, adminController.toggleUserBlock);
router.post('/users/:id/kyc', isModerator, adminController.updateKycStatus);

/**
 * Listing Moderation
 */
router.post('/properties/:id/moderate', isModerator, adminController.moderateProperty);

/**
 * Support & Tickets
 */
router.get('/tickets', isSupport, adminController.getTickets);
router.patch('/tickets/:id', isSupport, adminController.updateTicket);

/**
 * System Settings (Super Admin Only)
 */
router.get('/settings', isModerator, adminController.getSettings);
router.patch('/settings/:key', isSuperAdmin, adminController.updateSetting);

module.exports = router;
