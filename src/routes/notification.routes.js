const express = require('express');
const { verifyJWT, authorizeRoles } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate');
const controller = require('../controllers/notification.controller');
const { sendNotificationSchema } = require('../validators/notification.validator');

/**
 * Notification System (Section 3.14)
 */
const router = express.Router();

router.use(verifyJWT);

router.get('/', controller.listMyNotifications);
router.get('/unread-count', controller.getUnreadCount);
router.patch('/:id/read', controller.markRead);
router.patch('/read-all', controller.markAllRead);
router.post('/send', authorizeRoles('super_admin', 'school_admin'), validate(sendNotificationSchema), controller.sendNotification);

module.exports = router;