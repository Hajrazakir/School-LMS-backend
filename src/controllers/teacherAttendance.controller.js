const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const { TeacherAttendance } = require('../models');

/** Admin/accountant fallback entry when the biometric device didn't capture a punch (FR-6.7). */
const markManual = asyncHandler(async (req, res) => {
  const { teacher, date, status, checkInTime, checkOutTime } = req.body;
  const school = req.user.school;
  const attendanceDate = new Date(date);

  const record = await TeacherAttendance.findOneAndUpdate(
    { teacher, date: attendanceDate },
    {
      $set: {
        school,
        teacher,
        date: attendanceDate,
        status,
        checkInTime: checkInTime ? new Date(checkInTime) : undefined,
        checkOutTime: checkOutTime ? new Date(checkOutTime) : undefined,
        source: 'manual',
        enteredBy: req.user._id,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return res.status(200).json(new ApiResponse(200, { attendance: record }, 'Teacher attendance saved'));
});

const listAttendance = asyncHandler(async (req, res) => {
  const filter = { school: req.user.school };
  if (req.query.teacher) filter.teacher = req.query.teacher;

  if (req.query.date) {
    filter.date = new Date(req.query.date);
  } else if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) filter.date.$gte = new Date(req.query.from);
    if (req.query.to) filter.date.$lte = new Date(req.query.to);
  }

  const records = await TeacherAttendance.find(filter).populate('teacher').sort({ date: -1 });
  return res.status(200).json(new ApiResponse(200, { attendance: records }, 'Teacher attendance fetched'));
});

module.exports = { markManual, listAttendance };