const express = require('express');
const { verifyJWT, authorizeRoles } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate');
const controller = require('../controllers/leave.controller');
const { applyLeaveSchema, decideLeaveSchema } = require('../validators/leave.validator');

/**
 * Leave Management (Section 3.17)
 */
const router = express.Router();

router.use(verifyJWT);

router.post('/', authorizeRoles('student', 'teacher'), validate(applyLeaveSchema), controller.applyLeave);
router.get('/', controller.listLeaves);
router.get('/:id', controller.getLeave);
router.patch('/:id/decide', authorizeRoles('super_admin', 'school_admin'), validate(decideLeaveSchema), controller.decideLeave);
router.delete('/:id', authorizeRoles('student', 'teacher'), controller.cancelLeave);

module.exports = router;