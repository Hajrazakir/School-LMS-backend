const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { Salary, Teacher, TeacherAttendance, School } = require('../models');

/** Counts unauthorized absences/late/half-days in a month and applies the school's deduction policy (FR-11.2). */
async function computeAttendanceDeduction(teacherId, month, schoolId) {
  const schoolDoc = await School.findById(schoolId);
  const policy = schoolDoc?.policies?.salaryDeduction || {};
  const allowed = policy.allowedAbsencesPerMonth ?? 0;
  const perDayRate = policy.perDayDeductionRate ?? 0;
  const latePenalty = policy.lateArrivalPenalty ?? 0;
  const halfDayDeduction = policy.halfDayDeduction ?? 0;

  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);

  const records = await TeacherAttendance.find({ teacher: teacherId, date: { $gte: start, $lt: end } });
  const absentCount = records.filter((r) => r.status === 'absent').length;
  const lateCount = records.filter((r) => r.status === 'late').length;
  const halfDayCount = records.filter((r) => r.status === 'half_day').length;

  const chargeableAbsences = Math.max(0, absentCount - allowed);
  const deduction = chargeableAbsences * perDayRate + lateCount * latePenalty + halfDayCount * halfDayDeduction;
  return Math.round(deduction * 100) / 100;
}

/** Builds (or rebuilds) one teacher's draft payslip for a month from their profile + actual attendance. */
async function buildDraft(teacherId, month, school) {
  const teacher = await Teacher.findOne({ _id: teacherId, school });
  if (!teacher) throw ApiError.notFound('Teacher not found');

  const attendanceDeduction = await computeAttendanceDeduction(teacherId, month, school);
  const basic = teacher.salary?.basic || 0;
  const allowances = teacher.salary?.allowances || 0;
  const bonus = teacher.salary?.bonus || 0;
  const tax = teacher.salary?.tax || 0;
  const netSalary = Math.max(0, Math.round((basic + allowances + bonus - tax - attendanceDeduction) * 100) / 100);

  return Salary.findOneAndUpdate(
    { teacher: teacherId, month },
    {
      $set: { school, teacher: teacherId, month, basic, allowances, bonus, tax, attendanceDeduction, netSalary },
      $setOnInsert: { status: 'draft' },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

const generateSalary = asyncHandler(async (req, res) => {
  const { teacher, month } = req.body;
  const salary = await buildDraft(teacher, month, req.user.school);
  return res.status(201).json(new ApiResponse(201, { salary }, 'Salary draft generated'));
});

const generateBatchSalaries = asyncHandler(async (req, res) => {
  const { month } = req.body;
  const school = req.user.school;
  const teachers = await Teacher.find({ school, isActive: true });
  if (!teachers.length) throw ApiError.badRequest('No active teachers found for this school');

  const drafts = await Promise.all(teachers.map((t) => buildDraft(t._id, month, school)));
  return res.status(201).json(new ApiResponse(201, { drafts }, `Generated ${drafts.length} salary drafts`));
});

const listSalaries = asyncHandler(async (req, res) => {
  const filter = { school: req.user.school };
  if (req.query.teacher) filter.teacher = req.query.teacher;
  if (req.query.month) filter.month = req.query.month;
  if (req.query.status) filter.status = req.query.status;

  const salaries = await Salary.find(filter).populate('teacher').sort({ month: -1 });
  return res.status(200).json(new ApiResponse(200, { salaries }, 'Salaries fetched'));
});

const getSalary = asyncHandler(async (req, res) => {
  const salary = await Salary.findOne({ _id: req.params.id, school: req.user.school }).populate('teacher');
  if (!salary) throw ApiError.notFound('Salary record not found');
  return res.status(200).json(new ApiResponse(200, { salary }, 'Salary fetched'));
});

const submitForApproval = asyncHandler(async (req, res) => {
  const salary = await Salary.findOne({ _id: req.params.id, school: req.user.school });
  if (!salary) throw ApiError.notFound('Salary record not found');
  if (salary.status !== 'draft') throw ApiError.badRequest('Only draft salaries can be submitted for approval');
  salary.status = 'pending_approval';
  await salary.save();
  return res.status(200).json(new ApiResponse(200, { salary }, 'Submitted for approval'));
});

const approveSalary = asyncHandler(async (req, res) => {
  const salary = await Salary.findOne({ _id: req.params.id, school: req.user.school });
  if (!salary) throw ApiError.notFound('Salary record not found');
  if (salary.status !== 'pending_approval') throw ApiError.badRequest('Only salaries pending approval can be approved');

  salary.status = 'approved';
  salary.approvedBy = req.user._id;
  salary.approvedAt = new Date();
  await salary.save();

  return res.status(200).json(new ApiResponse(200, { salary }, 'Salary approved'));
});

/** Marks it Paid and generates a transaction reference (gap-analysis: accountant disbursal must record this). */
const disburseSalary = asyncHandler(async (req, res) => {
  const salary = await Salary.findOne({ _id: req.params.id, school: req.user.school });
  if (!salary) throw ApiError.notFound('Salary record not found');
  if (salary.status !== 'approved') throw ApiError.badRequest('Only approved salaries can be disbursed');

  const { method } = req.body;
  salary.status = 'paid';
  salary.disbursement = {
    method,
    transactionReference: `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    processedAt: new Date(),
  };
  await salary.save();

  return res.status(200).json(new ApiResponse(200, { salary }, 'Salary disbursed'));
});

module.exports = {
  generateSalary,
  generateBatchSalaries,
  listSalaries,
  getSalary,
  submitForApproval,
  approveSalary,
  disburseSalary,
};