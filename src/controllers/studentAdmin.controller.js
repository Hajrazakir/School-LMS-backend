const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { User, Student } = require('../models');
const { recordAudit } = require('../services/audit.service');

function toClientShape(studentDoc) {
  const s = studentDoc.toObject ? studentDoc.toObject() : studentDoc;
  const u = s.user && s.user.fullName !== undefined ? s.user : null;
  return {
    id: s._id,
    name: u?.fullName,
    email: u?.email,
    phone: u?.phone,
    status: (u?.isActive ?? s.isActive) ? 'active' : 'inactive',
    rollNumber: s.rollNumber,
    class: s.class,
    section: s.section,
    gender: s.gender,
    dateOfBirth: s.dateOfBirth,
    admissionDate: s.admissionDate,
  };
}

/** School Admin / Accountant registers a student + creates their login account. */
const createStudent = asyncHandler(async (req, res) => {
  const b = req.body;
  const creator = req.user;
  const school = creator.school;
  if (!school) throw ApiError.badRequest('Your account is not linked to a school');

  const existingUser = await User.findOne({ email: b.email });
  if (existingUser) throw ApiError.conflict('An account with this email already exists');

  const existingRoll = await Student.findOne({ school, rollNumber: b.rollNumber });
  if (existingRoll) throw ApiError.conflict('A student with this roll number already exists');

  const fullName = `${b.firstName} ${b.lastName || ''}`.trim();

  const user = new User({
    fullName,
    email: b.email,
    phone: b.phone,
    role: 'student',
    school,
    isEmailVerified: true, // admin-provisioned accounts are trusted immediately
    isActive: true,
    createdBy: creator._id,
  });
  await user.setPassword(b.password);
  await user.save();

  const student = await Student.create({
    user: user._id,
    school,
    rollNumber: b.rollNumber,
    class: b.class,
    section: b.section,
    gender: b.gender,
    dateOfBirth: b.dateOfBirth ? new Date(b.dateOfBirth) : undefined,
    admissionDate: b.admissionDate ? new Date(b.admissionDate) : undefined,
  });

  await recordAudit({
    req, school, user: creator._id, role: creator.role,
    action: 'STUDENT_CREATED', module: 'students',
    newValue: { studentId: student._id, email: user.email },
  });

  const populated = await Student.findById(student._id).populate('user').populate('class');
  return res.status(201).json(new ApiResponse(201, { student: toClientShape(populated) }, 'Student registered successfully'));
});

const listStudents = asyncHandler(async (req, res) => {
  const filter = { school: req.user.school };
  if (req.query.class) filter.class = req.query.class;
  if (req.query.section) filter.section = req.query.section;

  const students = await Student.find(filter).populate('user').populate('class').sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, { students: students.map(toClientShape) }, 'Students fetched'));
});

const getStudent = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ _id: req.params.id, school: req.user.school }).populate('user').populate('class');
  if (!student) throw ApiError.notFound('Student not found');
  return res.status(200).json(new ApiResponse(200, { student: toClientShape(student) }, 'Student fetched'));
});

const updateStudent = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ _id: req.params.id, school: req.user.school });
  if (!student) throw ApiError.notFound('Student not found');
  const b = req.body;

  const fields = ['rollNumber', 'class', 'section', 'gender'];
  fields.forEach((f) => { if (b[f] !== undefined) student[f] = b[f]; });
  if (b.dateOfBirth) student.dateOfBirth = new Date(b.dateOfBirth);
  if (b.admissionDate) student.admissionDate = new Date(b.admissionDate);
  await student.save();

  if (b.firstName || b.lastName || b.phone) {
    const user = await User.findById(student.user);
    if (b.firstName || b.lastName) user.fullName = `${b.firstName ?? ''} ${b.lastName ?? ''}`.trim() || user.fullName;
    if (b.phone !== undefined) user.phone = b.phone;
    await user.save();
  }

  const populated = await Student.findById(student._id).populate('user').populate('class');
  return res.status(200).json(new ApiResponse(200, { student: toClientShape(populated) }, 'Student updated'));
});

const setStudentStatus = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ _id: req.params.id, school: req.user.school });
  if (!student) throw ApiError.notFound('Student not found');
  const { isActive } = req.body;

  student.isActive = isActive;
  await student.save();
  const user = await User.findById(student.user);
  user.isActive = isActive;
  if (!isActive) user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  return res.status(200).json(new ApiResponse(200, null, `Student ${isActive ? 'activated' : 'deactivated'}`));
});

const deleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ _id: req.params.id, school: req.user.school });
  if (!student) throw ApiError.notFound('Student not found');
  await User.findByIdAndDelete(student.user);
  await student.deleteOne();
  return res.status(200).json(new ApiResponse(200, null, 'Student deleted'));
});

module.exports = { createStudent, listStudents, getStudent, updateStudent, setStudentStatus, deleteStudent };