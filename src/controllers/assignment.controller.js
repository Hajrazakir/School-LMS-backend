const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { Assignment, Teacher, Student } = require('../models');

/** Teachers post their own assignments; admin/accountant must specify which teacher it's for. */
async function resolveTeacherId(req, providedTeacherId) {
  if (req.user.role === 'teacher') {
    const teacher = await Teacher.findOne({ user: req.user._id });
    if (!teacher) throw ApiError.badRequest('No teacher record is linked to your account');
    return teacher._id;
  }
  if (!providedTeacherId) throw ApiError.badRequest('teacher is required for non-teacher accounts');
  return providedTeacherId;
}

const createAssignment = asyncHandler(async (req, res) => {
  const b = req.body;
  const school = req.user.school;
  const teacherId = await resolveTeacherId(req, b.teacher);

  const assignment = await Assignment.create({
    school,
    teacher: teacherId,
    class: b.class,
    section: b.section,
    subject: b.subject,
    title: b.title,
    description: b.description,
    attachmentUrls: b.attachmentUrls,
    deadline: new Date(b.deadline),
  });

  return res.status(201).json(new ApiResponse(201, { assignment }, 'Assignment created'));
});

const listAssignments = asyncHandler(async (req, res) => {
  const filter = { school: req.user.school };
  ['class', 'section', 'subject', 'teacher'].forEach((f) => {
    if (req.query[f]) filter[f] = req.query[f];
  });

  const assignments = await Assignment.find(filter).populate('teacher').populate('subject').sort({ deadline: -1 });
  return res.status(200).json(new ApiResponse(200, { assignments }, 'Assignments fetched'));
});

const getAssignment = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findOne({ _id: req.params.id, school: req.user.school })
    .populate('teacher')
    .populate('submissions.student');
  if (!assignment) throw ApiError.notFound('Assignment not found');
  return res.status(200).json(new ApiResponse(200, { assignment }, 'Assignment fetched'));
});

const updateAssignment = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findOne({ _id: req.params.id, school: req.user.school });
  if (!assignment) throw ApiError.notFound('Assignment not found');
  const b = req.body;

  ['class', 'section', 'subject', 'title', 'description', 'attachmentUrls'].forEach((f) => {
    if (b[f] !== undefined) assignment[f] = b[f];
  });
  if (b.deadline) assignment.deadline = new Date(b.deadline);
  await assignment.save();

  return res.status(200).json(new ApiResponse(200, { assignment }, 'Assignment updated'));
});

const deleteAssignment = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findOne({ _id: req.params.id, school: req.user.school });
  if (!assignment) throw ApiError.notFound('Assignment not found');
  await assignment.deleteOne();
  return res.status(200).json(new ApiResponse(200, null, 'Assignment deleted'));
});

/** Student submits/resubmits their work; the "late" flag is computed automatically against the deadline. */
const submitAssignment = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findOne({ _id: req.params.id, school: req.user.school });
  if (!assignment) throw ApiError.notFound('Assignment not found');

  const student = await Student.findOne({ user: req.user._id, school: req.user.school });
  if (!student) throw ApiError.badRequest('No student record is linked to your account');

  const { fileUrl } = req.body;
  const now = new Date();
  const isLate = now > assignment.deadline;

  const existing = assignment.submissions.find((s) => String(s.student) === String(student._id));
  if (existing) {
    existing.fileUrl = fileUrl;
    existing.submittedAt = now;
    existing.isLate = isLate;
  } else {
    assignment.submissions.push({ student: student._id, fileUrl, submittedAt: now, isLate });
  }

  await assignment.save();
  return res.status(200).json(new ApiResponse(200, { assignment }, isLate ? 'Submitted (marked late)' : 'Submitted on time'));
});

/** Teacher/admin grades one student's submission. */
const gradeSubmission = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findOne({ _id: req.params.id, school: req.user.school });
  if (!assignment) throw ApiError.notFound('Assignment not found');

  let gradedByTeacherId;
  if (req.user.role === 'teacher') {
    const teacher = await Teacher.findOne({ user: req.user._id });
    gradedByTeacherId = teacher?._id;
  }

  const { student: studentId, marks, feedback } = req.body;
  const submission = assignment.submissions.find((s) => String(s.student) === String(studentId));
  if (!submission) throw ApiError.notFound('No submission from this student was found');

  submission.marks = marks;
  submission.feedback = feedback;
  submission.gradedBy = gradedByTeacherId;
  submission.gradedAt = new Date();

  await assignment.save();
  return res.status(200).json(new ApiResponse(200, { assignment }, 'Submission graded'));
});

module.exports = {
  createAssignment,
  listAssignments,
  getAssignment,
  updateAssignment,
  deleteAssignment,
  submitAssignment,
  gradeSubmission,
};