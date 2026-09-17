const express = require('express');

const router = express.Router();

router.use('/auth', require('./auth.routes'));
router.use('/admin', require('./admin.routes'));
router.use('/students', require('./student.routes'));
router.use('/teachers', require('./teacher.routes'));
router.use('/attendance/students', require('./studentAttendance.routes'));
router.use('/attendance/teachers', require('./teacherAttendance.routes'));
router.use('/exams', require('./exam.routes'));
router.use('/fees', require('./fee.routes'));
router.use('/payments', require('./payment.routes'));
router.use('/accountant', require('./accountant.routes'));
router.use('/salaries', require('./salary.routes'));
router.use('/parents', require('./parent.routes'));
router.use('/chat', require('./chat.routes'));
router.use('/notifications', require('./notification.routes'));
router.use('/timetable', require('./timetable.routes'));
router.use('/assignments', require('./assignment.routes'));
router.use('/leaves', require('./leave.routes'));
router.use('/reports', require('./report.routes'));
router.use('/settings', require('./settings.routes'));
router.use('/audit-logs', require('./audit.routes'));

module.exports = router;
