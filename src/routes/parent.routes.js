const express = require('express');
const { verifyJWT, authorizeRoles } = require('../middlewares/auth.middleware');
const controller = require('../controllers/parentPortal.controller');

/**
 * Parent Portal (Section 3.12) - read-only self-service for a parent's own children.
 */
const router = express.Router();

router.use(verifyJWT);
router.use(authorizeRoles('parent'));

router.get('/my-children', controller.getMyChildren);
router.get('/children/:childId/attendance', controller.getChildAttendance);
router.get('/children/:childId/results', controller.getChildResults);
router.get('/children/:childId/fees', controller.getChildFees);

module.exports = router;