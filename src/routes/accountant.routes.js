const express = require('express');
const { verifyJWT, authorizeRoles } = require('../middlewares/auth.middleware');
const controller = require('../controllers/accountant.controller');

/**
 * Accountant Portal (Section 3.10)
 */
const router = express.Router();

router.use(verifyJWT);
router.use(authorizeRoles('super_admin', 'school_admin', 'accountant'));

router.get('/dashboard-summary', controller.getDashboardSummary);

module.exports = router;
