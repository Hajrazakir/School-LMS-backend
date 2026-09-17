const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const { FeeChallan, Salary, Student, Teacher } = require('../models');

/** At-a-glance numbers for the accountant's landing page (Section 3.10). */
const getDashboardSummary = asyncHandler(async (req, res) => {
  const school = req.user.school;

  const [totalStudents, activeTeachers, unpaidChallans, partiallyPaidChallans, pendingSalaries] = await Promise.all([
    Student.countDocuments({ school, isActive: true }),
    Teacher.countDocuments({ school, isActive: true }),
    FeeChallan.find({ school, status: 'unpaid' }),
    FeeChallan.find({ school, status: 'partially_paid' }),
    Salary.countDocuments({ school, status: { $in: ['draft', 'pending_approval', 'approved'] } }),
  ]);

  const outstandingAmount = [...unpaidChallans, ...partiallyPaidChallans].reduce(
    (sum, c) => sum + (c.totalAmount - c.paidAmount),
    0
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalStudents,
        activeTeachers,
        unpaidChallanCount: unpaidChallans.length,
        partiallyPaidChallanCount: partiallyPaidChallans.length,
        outstandingAmount,
        pendingSalaries,
      },
      'Dashboard summary fetched'
    )
  );
});

module.exports = { getDashboardSummary };