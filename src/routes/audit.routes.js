const express = require('express');
const { verifyJWT, authorizeRoles } = require('../middlewares/auth.middleware');
const controller = require('../controllers/audit.controller');

/**
 * Audit Logs and Security (Section 3.20)
 */
const router = express.Router();

router.use(verifyJWT);
router.use(authorizeRoles('super_admin', 'school_admin'));

router.get('/', controller.listAuditLogs);

module.exports = router;
