const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { StudentAttendance, TeacherAttendance, Payment, Salary } = require('../models');

function requireRange(req) {
  const { from, to } = req.query;
  if (!from || !to) throw ApiError.badRequest('Both "from" and "to" date query params are required (YYYY-MM-DD)');
  return { from: new Date(from), to: new Date(to) };
}

/** Per-student attendance summary for a date range (gap-analysis: "Student attendance (date range)"). */
const studentAttendanceReport = asyncHandler(async (req, res) => {
  const { from, to } = requireRange(req);
  const school = req.user.school;
  const match = { school: new mongoose.Types.ObjectId(school), date: { $gte: from, $lte: to } };
  if (req.query.class) match.class = new mongoose.Types.ObjectId(req.query.class);
  if (req.query.section) match.section = req.query.section;
  if (req.query.student) match.student = new mongoose.Types.ObjectId(req.query.student);

  const rows = await StudentAttendance.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$student',
        present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
        absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
        late: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
        halfDay: { $sum: { $cond: [{ $eq: ['$status', 'half_day'] }, 1, 0] } },
        onLeave: { $sum: { $cond: [{ $eq: ['$status', 'on_leave'] }, 1, 0] } },
        total: { $sum: 1 },
      },
    },
    { $lookup: { from: 'students', localField: '_id', foreignField: '_id', as: 'studentInfo' } },
    { $unwind: '$studentInfo' },
    { $lookup: { from: 'users', localField: 'studentInfo.user', foreignField: '_id', as: 'userInfo' } },
    { $unwind: '$userInfo' },
    {
      $project: {
        _id: 0,
        student: '$_id',
        name: '$userInfo.fullName',
        rollNumber: '$studentInfo.rollNumber',
        present: 1,
        absent: 1,
        late: 1,
        halfDay: 1,
        onLeave: 1,
        total: 1,
        percentage: {
          $cond: [{ $eq: ['$total', 0] }, 0, { $round: [{ $multiply: [{ $divide: ['$present', '$total'] }, 100] }, 2] }],
        },
      },
    },
    { $sort: { name: 1 } },
  ]);

  return res.status(200).json(new ApiResponse(200, { from: req.query.from, to: req.query.to, students: rows }, 'Student attendance report generated'));
});

/** Per-teacher attendance summary for a date range (gap-analysis: "Teacher attendance (date range)"). */
const teacherAttendanceReport = asyncHandler(async (req, res) => {
  const { from, to } = requireRange(req);
  const school = req.user.school;
  const match = { school: new mongoose.Types.ObjectId(school), date: { $gte: from, $lte: to } };
  if (req.query.teacher) match.teacher = new mongoose.Types.ObjectId(req.query.teacher);

  const rows = await TeacherAttendance.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$teacher',
        present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
        absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
        late: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
        halfDay: { $sum: { $cond: [{ $eq: ['$status', 'half_day'] }, 1, 0] } },
        onLeave: { $sum: { $cond: [{ $eq: ['$status', 'on_leave'] }, 1, 0] } },
        total: { $sum: 1 },
      },
    },
    { $lookup: { from: 'teachers', localField: '_id', foreignField: '_id', as: 'teacherInfo' } },
    { $unwind: '$teacherInfo' },
    { $lookup: { from: 'users', localField: 'teacherInfo.user', foreignField: '_id', as: 'userInfo' } },
    { $unwind: '$userInfo' },
    {
      $project: {
        _id: 0,
        teacher: '$_id',
        name: '$userInfo.fullName',
        employeeId: '$teacherInfo.employeeId',
        present: 1,
        absent: 1,
        late: 1,
        halfDay: 1,
        onLeave: 1,
        total: 1,
        percentage: {
          $cond: [{ $eq: ['$total', 0] }, 0, { $round: [{ $multiply: [{ $divide: ['$present', '$total'] }, 100] }, 2] }],
        },
      },
    },
    { $sort: { name: 1 } },
  ]);

  return res.status(200).json(new ApiResponse(200, { from: req.query.from, to: req.query.to, teachers: rows }, 'Teacher attendance report generated'));
});

/** Total + per-student fee collected in a date range (gap-analysis: "Total fee collected", "Student fee collected"). */
const feeCollectionReport = asyncHandler(async (req, res) => {
  const { from, to } = requireRange(req);
  const school = req.user.school;
  const match = { school: new mongoose.Types.ObjectId(school), status: 'successful', createdAt: { $gte: from, $lte: to } };

  const byMethod = await Payment.aggregate([
    { $match: match },
    { $group: { _id: '$method', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $project: { _id: 0, method: '$_id', total: 1, count: 1 } },
  ]);
  const grandTotal = byMethod.reduce((sum, m) => sum + m.total, 0);

  const byStudent = await Payment.aggregate([
    { $match: match },
    { $group: { _id: '$student', totalPaid: { $sum: '$amount' }, paymentsCount: { $sum: 1 } } },
    { $lookup: { from: 'students', localField: '_id', foreignField: '_id', as: 'studentInfo' } },
    { $unwind: '$studentInfo' },
    { $lookup: { from: 'users', localField: 'studentInfo.user', foreignField: '_id', as: 'userInfo' } },
    { $unwind: '$userInfo' },
    {
      $project: {
        _id: 0,
        student: '$_id',
        name: '$userInfo.fullName',
        rollNumber: '$studentInfo.rollNumber',
        totalPaid: 1,
        paymentsCount: 1,
      },
    },
    { $sort: { totalPaid: -1 } },
  ]);

  return res.status(200).json(
    new ApiResponse(200, { from: req.query.from, to: req.query.to, grandTotal, byMethod, byStudent }, 'Fee collection report generated')
  );
});

/** Total + per-teacher salary disbursed in a date range (gap-analysis: "Total salary given"). */
const salaryReport = asyncHandler(async (req, res) => {
  const { from, to } = requireRange(req);
  const school = req.user.school;
  const match = {
    school: new mongoose.Types.ObjectId(school),
    status: 'paid',
    'disbursement.processedAt': { $gte: from, $lte: to },
  };

  const rows = await Salary.aggregate([
    { $match: match },
    { $lookup: { from: 'teachers', localField: 'teacher', foreignField: '_id', as: 'teacherInfo' } },
    { $unwind: '$teacherInfo' },
    { $lookup: { from: 'users', localField: 'teacherInfo.user', foreignField: '_id', as: 'userInfo' } },
    { $unwind: '$userInfo' },
    {
      $project: {
        _id: 0,
        teacher: '$teacher',
        name: '$userInfo.fullName',
        month: 1,
        netSalary: 1,
        processedAt: '$disbursement.processedAt',
        transactionReference: '$disbursement.transactionReference',
      },
    },
    { $sort: { processedAt: -1 } },
  ]);
  const grandTotal = rows.reduce((sum, r) => sum + r.netSalary, 0);

  return res.status(200).json(new ApiResponse(200, { from: req.query.from, to: req.query.to, grandTotal, salaries: rows }, 'Salary report generated'));
});

module.exports = { studentAttendanceReport, teacherAttendanceReport, feeCollectionReport, salaryReport };