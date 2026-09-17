const express = require('express');
const { verifyJWT, authorizeRoles } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate');
const controller = require('../controllers/chat.controller');
const {
  startConversationSchema,
  sendMessageSchema,
  reportMessageSchema,
  restrictConversationSchema,
} = require('../validators/chat.validator');

/**
 * Parent-Teacher Chat System (Section 3.13)
 */
const router = express.Router();

router.use(verifyJWT);

const adminOnly = authorizeRoles('super_admin', 'school_admin');

// --- Admin moderation (static paths first so they aren't swallowed by '/:id') ---
router.get('/reported-messages', adminOnly, controller.listReportedMessages);

// --- Conversations ---
router.post('/conversations', authorizeRoles('parent'), validate(startConversationSchema), controller.startConversation);
router.get('/conversations', controller.listConversations);
router.get('/conversations/:id/messages', controller.listMessages);
router.post('/conversations/:id/messages', validate(sendMessageSchema), controller.sendMessage);
router.patch('/conversations/:id/read', controller.markRead);
router.patch('/conversations/:id/restrict', adminOnly, validate(restrictConversationSchema), controller.setConversationRestriction);

// --- Individual messages ---
router.delete('/messages/:messageId', controller.deleteMessage);
router.patch('/messages/:messageId/report', validate(reportMessageSchema), controller.reportMessage);

module.exports = router;
