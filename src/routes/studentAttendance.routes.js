const express = require('express');
const { verifyJWT, authorizeRoles } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate');
const controller = require('../controllers/studentAttendance.controller');
const { markAttendanceSchema, updateAttendanceSchema } = require('../validators/studentAttendance.validator');

/**
 * Student Attendance System (Section 3.5)
 */
const router = express.Router();

router.use(verifyJWT);

router.post(
  '/mark',
  authorizeRoles('super_admin', 'school_admin', 'teacher'),
  validate(markAttendanceSchema),
  controller.markAttendance
);
router.get('/', controller.listAttendance);
router.patch(
  '/:id',
  authorizeRoles('super_admin', 'school_admin', 'teacher'),
  validate(updateAttendanceSchema),
  controller.updateAttendance
);

module.exports = router;
