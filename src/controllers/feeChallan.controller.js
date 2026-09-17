const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { FeeChallan, FeeStructure, Student, Payment } = require('../models');

function generateChallanNumber() {
  return `CH-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

/** Applies a FeeStructure's components + discounts/scholarships into a challan breakdown + total. */
function computeBreakdown(feeStructure) {
  const c = feeStructure.components ? feeStructure.components.toObject?.() ?? feeStructure.components : {};
  const componentsTotal = Object.values(c).reduce((sum, v) => sum + (v || 0), 0);

  const discountTotal = (feeStructure.discounts || []).reduce(
    (sum, d) => sum + (d.type === 'percent' ? (componentsTotal * d.value) / 100 : d.value),
    0
  );
  const scholarshipTotal = (feeStructure.scholarships || []).reduce(
    (sum, s) => sum + (s.type === 'percent' ? (componentsTotal * s.value) / 100 : s.value),
    0
  );

  const totalAmount = Math.max(0, Math.round((componentsTotal - discountTotal - scholarshipTotal) * 100) / 100);

  return {
    breakdown: { ...c, lateFine: 0, discount: discountTotal, scholarship: scholarshipTotal },
    totalAmount,
  };
}

/** Generate one challan for one student for a billing month (FR-8.x). */
const generateChallan = asyncHandler(async (req, res) => {
  const { student: studentId, billingMonth, dueDate } = req.body;
  const school = req.user.school;

  const student = await Student.findOne({ _id: studentId, school });
  if (!student) throw ApiError.notFound('Student not found');

  const feeStructure = await FeeStructure.findOne({ school, class: student.class });
  if (!feeStructure) throw ApiError.badRequest("No fee structure has been set up for this student's class yet");

  const { breakdown, totalAmount } = computeBreakdown(feeStructure);

  try {
    const challan = await FeeChallan.create({
      school,
      student: studentId,
      feeStructure: feeStructure._id,
      challanNumber: generateChallanNumber(),
      billingMonth,
      dueDate: new Date(dueDate),
      breakdown,
      totalAmount,
    });
    return res.status(201).json(new ApiResponse(201, { challan }, 'Challan generated'));
  } catch (err) {
    if (err.code === 11000) throw ApiError.conflict('A challan for this student and month already exists');
    throw err;
  }
});

/** Generate challans for a whole class/section in one go ("Generate New Batch"). */
const generateBatchChallans = asyncHandler(async (req, res) => {
  const { class: classId, section, billingMonth, dueDate } = req.body;
  const school = req.user.school;

  const feeStructure = await FeeStructure.findOne({ school, class: classId });
  if (!feeStructure) throw ApiError.badRequest('No fee structure has been set up for this class yet');

  const studentFilter = { school, class: classId };
  if (section) studentFilter.section = section;
  const students = await Student.find(studentFilter);
  if (!students.length) throw ApiError.badRequest('No students found for this class/section');

  const { breakdown, totalAmount } = computeBreakdown(feeStructure);
  const created = [];
  let skippedCount = 0;

  for (const student of students) {
    try {
      const challan = await FeeChallan.create({
        school,
        student: student._id,
        feeStructure: feeStructure._id,
        challanNumber: generateChallanNumber(),
        billingMonth,
        dueDate: new Date(dueDate),
        breakdown,
        totalAmount,
      });
      created.push(challan);
    } catch (err) {
      if (err.code === 11000) skippedCount += 1; // already has a challan for this month
      else throw err;
    }
  }

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { created, skippedCount },
        `Generated ${created.length} challans, skipped ${skippedCount} (already existed)`
      )
    );
});

const listChallans = asyncHandler(async (req, res) => {
  const filter = { school: req.user.school };
  if (req.query.student) filter.student = req.query.student;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.billingMonth) filter.billingMonth = req.query.billingMonth;

  const challans = await FeeChallan.find(filter).populate('student').sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, { challans }, 'Challans fetched'));
});

const getChallan = asyncHandler(async (req, res) => {
  const challan = await FeeChallan.findOne({ _id: req.params.id, school: req.user.school }).populate('student');
  if (!challan) throw ApiError.notFound('Challan not found');
  return res.status(200).json(new ApiResponse(200, { challan }, 'Challan fetched'));
});

/** Records a payment against a challan and updates its running ledger (paidAmount/status). */
const collectPayment = asyncHandler(async (req, res) => {
  const challan = await FeeChallan.findOne({ _id: req.params.id, school: req.user.school });
  if (!challan) throw ApiError.notFound('Challan not found');
  if (challan.status === 'paid') throw ApiError.badRequest('This challan is already fully paid');

  const { amount, method, transactionId, bankName } = req.body;
  const remaining = challan.totalAmount - challan.paidAmount;
  if (amount > remaining) {
    throw ApiError.badRequest(`Amount exceeds the remaining balance of Rs ${remaining}`);
  }

  let payment;
  try {
    payment = await Payment.create({
      school: challan.school,
      student: challan.student,
      challan: challan._id,
      amount,
      method,
      transactionId,
      bankName,
      status: 'successful', // recorded directly by an accountant, not via a gateway callback
    });
  } catch (err) {
    if (err.code === 11000) throw ApiError.conflict('A payment with this transaction ID has already been recorded');
    throw err;
  }

  challan.paidAmount += amount;
  challan.status = challan.paidAmount >= challan.totalAmount ? 'paid' : 'partially_paid';
  await challan.save();

  return res.status(201).json(new ApiResponse(201, { payment, challan }, 'Payment recorded'));
});

const listPayments = asyncHandler(async (req, res) => {
  const filter = { school: req.user.school };
  if (req.query.student) filter.student = req.query.student;
  if (req.query.challan) filter.challan = req.query.challan;

  const payments = await Payment.find(filter).populate('student').populate('challan').sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, { payments }, 'Payments fetched'));
});

module.exports = {
  generateChallan,
  generateBatchChallans,
  listChallans,
  getChallan,
  collectPayment,
  listPayments,
};