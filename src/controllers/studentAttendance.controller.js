const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { StudentAttendance, Teacher } = require('../models');

/** Teachers mark their own classes; admin/accountant must pass a teacher id. */
async function resolveTeacherId(req, providedTeacherId) {
  if (req.user.role === 'teacher') {
    const teacher = await Teacher.findOne({ user: req.user._id });
    if (!teacher) throw ApiError.badRequest('No teacher record is linked to your account');
    return teacher._id;
  }
  if (!providedTeacherId) throw ApiError.badRequest('teacher is required for non-teacher accounts');
  return providedTeacherId;
}

/** Bulk mark/update a whole roster for one class+section+subject+date (FR-5.1, "mark all present"). */
const markAttendance = asyncHandler(async (req, res) => {
  const { class: classId, section, subject, date, records, teacher: teacherId } = req.body;
  const school = req.user.school;
  const resolvedTeacher = await resolveTeacherId(req, teacherId);
  const attendanceDate = new Date(date);

  const ops = records.map((r) => ({
    updateOne: {
      filter: { student: r.student, subject, date: attendanceDate },
      update: {
        $set: {
          school,
          class: classId,
          section,
          subject,
          teacher: resolvedTeacher,
          date: attendanceDate,
          status: r.status,
          remarks: r.remarks,
        },
      },
      upsert: true,
    },
  }));

  await StudentAttendance.bulkWrite(ops);

  const saved = await StudentAttendance.find({ school, class: classId, section, subject, date: attendanceDate })
    .populate('student');
  return res.status(200).json(new ApiResponse(200, { attendance: saved }, 'Attendance saved'));
});

/** List with optional class/section/subject/student filters and a date or date-range filter. */
const listAttendance = asyncHandler(async (req, res) => {
  const filter = { school: req.user.school };
  ['class', 'section', 'subject', 'student'].forEach((f) => {
    if (req.query[f]) filter[f] = req.query[f];
  });

  if (req.query.date) {
    filter.date = new Date(req.query.date);
  } else if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) filter.date.$gte = new Date(req.query.from);
    if (req.query.to) filter.date.$lte = new Date(req.query.to);
  }

  const records = await StudentAttendance.find(filter).populate('student').sort({ date: -1 });
  return res.status(200).json(new ApiResponse(200, { attendance: records }, 'Attendance fetched'));
});

/** Correct a single record; keeps an audit trail (FR-5.6). */
const updateAttendance = asyncHandler(async (req, res) => {
  const record = await StudentAttendance.findOne({ _id: req.params.id, school: req.user.school });
  if (!record) throw ApiError.notFound('Attendance record not found');
  const { status, remarks, reason } = req.body;

  if (status && status !== record.status) {
    record.editHistory.push({ previousStatus: record.status, editedBy: req.user._id, reason });
    record.status = status;
  }
  if (remarks !== undefined) record.remarks = remarks;
  await record.save();

  return res.status(200).json(new ApiResponse(200, { attendance: record }, 'Attendance updated'));
});

module.exports = { markAttendance, listAttendance, updateAttendance };