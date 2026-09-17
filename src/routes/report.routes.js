const express = require('express');
const { verifyJWT, authorizeRoles } = require('../middlewares/auth.middleware');
const controller = require('../controllers/report.controller');

/**
 * Reports and Analytics (Section 3.18)
 * All reports take ?from=YYYY-MM-DD&to=YYYY-MM-DD (required) plus
 * optional filters (class/section/student/teacher depending on the report).
 */
const router = express.Router();

router.use(verifyJWT);
router.use(authorizeRoles('super_admin', 'school_admin', 'accountant'));

router.get('/attendance/students', controller.studentAttendanceReport);
router.get('/attendance/teachers', controller.teacherAttendanceReport);
router.get('/fees/collection', controller.feeCollectionReport);
router.get('/salary', controller.salaryReport);

module.exports = router;
