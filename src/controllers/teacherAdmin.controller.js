const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { User, Teacher } = require('../models');
const { recordAudit } = require('../services/audit.service');

function toClientShape(teacherDoc) {
  const t = teacherDoc.toObject ? teacherDoc.toObject() : teacherDoc;
  const u = t.user && t.user.fullName !== undefined ? t.user : null;
  return {
    id: t._id,
    employeeId: t.employeeId,
    name: u?.fullName,
    email: u?.email,
    phone: u?.phone,
    status: (u?.isActive ?? t.isActive) ? 'active' : 'inactive',
    gender: t.gender,
    dob: t.dob,
    cnic: t.cnic,
    bloodGroup: t.bloodGroup,
    address: t.address,
    city: t.city,
    emergencyContact: t.emergencyContact,
    department: t.department,
    designation: t.designation,
    qualification: t.qualification,
    specialization: t.specialization,
    experienceYears: t.experienceYears,
    employmentType: t.employmentType,
    joinDate: t.dateOfJoining,
    assignedClasses: t.assignedClasses,
    assignedSections: t.assignedSections,
    subjects: t.subjects,
    classTeacherOf: t.classTeacherOf,
    basicSalary: t.salary?.basic,
    allowances: t.salary?.allowances,
    bonus: t.salary?.bonus,
    tax: t.salary?.tax,
    attendanceDeduction: t.salary?.attendanceDeduction,
    netSalary: t.salary?.netSalary,
    bankAccount: t.salary?.bankAccount,
    checkInTime: t.checkInTime,
    checkOutTime: t.checkOutTime,
    documents: t.documents,
  };
}

/** FR-2.2/2.3: School Admin (and Accountant, per the current UI) registers a teacher + creates their login account. */
const createTeacher = asyncHandler(async (req, res) => {
  const b = req.body;
  const creator = req.user;
  const school = creator.school;
  if (!school) throw ApiError.badRequest('Your account is not linked to a school');

  const existingUser = await User.findOne({ email: b.email });
  if (existingUser) throw ApiError.conflict('An account with this email already exists');

  const fullName = `${b.firstName} ${b.lastName || ''}`.trim();
  const basic = b.basicSalary || 0;
  const allowances = b.allowances || 0;
  const bonus = b.bonus || 0;
  const tax = b.tax || 0;
  const attendanceDeduction = b.attendanceDeduction || 0;
  const netSalary = basic + allowances + bonus - tax - attendanceDeduction;

  const user = new User({
    fullName,
    email: b.email,
    phone: b.phone,
    role: 'teacher',
    school,
    isEmailVerified: true, // admin-provisioned accounts are trusted immediately
    isActive: true,
    createdBy: creator._id,
  });
  await user.setPassword(b.password);
  await user.save();

  const lastTeacher = await Teacher.findOne({ school }).sort({ createdAt: -1 });
  const employeeId = `EMP-${1000 + ((lastTeacher?.employeeId?.match(/\d+/)?.[0] ? Number(lastTeacher.employeeId.match(/\d+/)[0]) - 999 : 0)) + 1}`;

  const teacher = await Teacher.create({
    user: user._id,
    school,
    employeeId,
    gender: b.gender,
    dob: b.dob ? new Date(b.dob) : undefined,
    cnic: b.cnic,
    bloodGroup: b.bloodGroup,
    address: b.address,
    city: b.city,
    emergencyContact: b.emergencyContact,
    department: b.department,
    designation: b.designation,
    qualification: b.qualification,
    specialization: b.specialization,
    experienceYears: b.experienceYears,
    employmentType: b.employmentType,
    assignedClasses: b.assignedClasses || [],
    assignedSections: b.assignedSections || [],
    subjects: b.subjects || [],
    classTeacherOf: b.classTeacherOf,
    salary: { basic, allowances, bonus, tax, attendanceDeduction, netSalary, bankAccount: b.bankAccount },
    checkInTime: b.checkInTime,
    checkOutTime: b.checkOutTime,
  });

  await recordAudit({
    req, school, user: creator._id, role: creator.role,
    action: 'TEACHER_CREATED', module: 'teachers',
    newValue: { teacherId: teacher._id, email: user.email },
  });

  const populated = await Teacher.findById(teacher._id).populate('user');
  return res.status(201).json(new ApiResponse(201, { teacher: toClientShape(populated) }, 'Teacher registered successfully'));
});

const listTeachers = asyncHandler(async (req, res) => {
  const teachers = await Teacher.find({ school: req.user.school }).populate('user').sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, { teachers: teachers.map(toClientShape) }, 'Teachers fetched'));
});

const getTeacher = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findOne({ _id: req.params.id, school: req.user.school }).populate('user');
  if (!teacher) throw ApiError.notFound('Teacher not found');
  return res.status(200).json(new ApiResponse(200, { teacher: toClientShape(teacher) }, 'Teacher fetched'));
});

const updateTeacher = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findOne({ _id: req.params.id, school: req.user.school });
  if (!teacher) throw ApiError.notFound('Teacher not found');
  const b = req.body;

  const fields = ['gender', 'cnic', 'bloodGroup', 'address', 'city', 'emergencyContact', 'department',
    'designation', 'qualification', 'specialization', 'experienceYears', 'employmentType',
    'assignedClasses', 'assignedSections', 'subjects', 'classTeacherOf', 'checkInTime', 'checkOutTime'];
  fields.forEach((f) => { if (b[f] !== undefined) teacher[f] = b[f]; });
  if (b.dob) teacher.dob = new Date(b.dob);

  if ([b.basicSalary, b.allowances, b.bonus, b.tax, b.attendanceDeduction].some((v) => v !== undefined)) {
    const basic = b.basicSalary ?? teacher.salary.basic;
    const allowances = b.allowances ?? teacher.salary.allowances;
    const bonus = b.bonus ?? teacher.salary.bonus;
    const tax = b.tax ?? teacher.salary.tax;
    const attendanceDeduction = b.attendanceDeduction ?? teacher.salary.attendanceDeduction;
    teacher.salary = { basic, allowances, bonus, tax, attendanceDeduction, netSalary: basic + allowances + bonus - tax - attendanceDeduction, bankAccount: b.bankAccount ?? teacher.salary.bankAccount };
  }
  await teacher.save();

  if (b.firstName || b.lastName || b.phone) {
    const user = await User.findById(teacher.user);
    if (b.firstName || b.lastName) user.fullName = `${b.firstName ?? ''} ${b.lastName ?? ''}`.trim() || user.fullName;
    if (b.phone !== undefined) user.phone = b.phone;
    await user.save();
  }

  const populated = await Teacher.findById(teacher._id).populate('user');
  return res.status(200).json(new ApiResponse(200, { teacher: toClientShape(populated) }, 'Teacher updated'));
});

const setTeacherStatus = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findOne({ _id: req.params.id, school: req.user.school });
  if (!teacher) throw ApiError.notFound('Teacher not found');
  const { isActive } = req.body;

  teacher.isActive = isActive;
  await teacher.save();
  const user = await User.findById(teacher.user);
  user.isActive = isActive;
  if (!isActive) user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  return res.status(200).json(new ApiResponse(200, null, `Teacher ${isActive ? 'activated' : 'deactivated'}`));
});

const deleteTeacher = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findOne({ _id: req.params.id, school: req.user.school });
  if (!teacher) throw ApiError.notFound('Teacher not found');
  await User.findByIdAndDelete(teacher.user);
  await teacher.deleteOne();
  return res.status(200).json(new ApiResponse(200, null, 'Teacher deleted'));
});

module.exports = { createTeacher, listTeachers, getTeacher, updateTeacher, setTeacherStatus, deleteTeacher };