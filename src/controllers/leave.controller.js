const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { Leave } = require('../models');

const APPLICANT_ROLES = ['student', 'teacher'];

/** Student or teacher applies for their own leave. */
const applyLeave = asyncHandler(async (req, res) => {
  if (!APPLICANT_ROLES.includes(req.user.role)) {
    throw ApiError.badRequest('Only students and teachers can apply for leave');
  }
  const b = req.body;
  const startDate = new Date(b.startDate);
  const endDate = new Date(b.endDate);
  if (startDate > endDate) throw ApiError.badRequest('startDate cannot be after endDate');

  const leave = await Leave.create({
    school: req.user.school,
    applicant: req.user._id,
    applicantRole: req.user.role,
    leaveType: b.leaveType,
    startDate,
    endDate,
    reason: b.reason,
    supportingDocumentUrl: b.supportingDocumentUrl,
  });

  return res.status(201).json(new ApiResponse(201, { leave }, 'Leave application submitted'));
});

/** Admins see everyone's requests; students/teachers only see their own. */
const listLeaves = asyncHandler(async (req, res) => {
  const filter = { school: req.user.school };
  if (['student', 'teacher'].includes(req.user.role)) {
    filter.applicant = req.user._id;
  } else if (req.query.applicant) {
    filter.applicant = req.query.applicant;
  }
  if (req.query.status) filter.status = req.query.status;
  if (req.query.applicantRole) filter.applicantRole = req.query.applicantRole;

  const leaves = await Leave.find(filter).populate('applicant').sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, { leaves }, 'Leave applications fetched'));
});

const getLeave = asyncHandler(async (req, res) => {
  const leave = await Leave.findOne({ _id: req.params.id, school: req.user.school }).populate('applicant');
  if (!leave) throw ApiError.notFound('Leave application not found');

  const isOwner = String(leave.applicant._id ?? leave.applicant) === String(req.user._id);
  const isStaff = !['student', 'teacher'].includes(req.user.role);
  if (!isOwner && !isStaff) throw ApiError.forbidden("You don't have access to this leave application");

  return res.status(200).json(new ApiResponse(200, { leave }, 'Leave application fetched'));
});

/** Admin approves or rejects a pending request. */
const decideLeave = asyncHandler(async (req, res) => {
  const leave = await Leave.findOne({ _id: req.params.id, school: req.user.school });
  if (!leave) throw ApiError.notFound('Leave application not found');
  if (leave.status !== 'pending') throw ApiError.badRequest('This leave application has already been decided');

  leave.status = req.body.status;
  leave.decidedBy = req.user._id;
  leave.decidedAt = new Date();
  await leave.save();

  return res.status(200).json(new ApiResponse(200, { leave }, `Leave ${req.body.status}`));
});

/** Applicant withdraws their own still-pending request. */
const cancelLeave = asyncHandler(async (req, res) => {
  const leave = await Leave.findOne({ _id: req.params.id, school: req.user.school });
  if (!leave) throw ApiError.notFound('Leave application not found');
  if (String(leave.applicant) !== String(req.user._id)) {
    throw ApiError.forbidden('You can only cancel your own leave application');
  }
  if (leave.status !== 'pending') throw ApiError.badRequest('Only pending applications can be cancelled');

  await leave.deleteOne();
  return res.status(200).json(new ApiResponse(200, null, 'Leave application cancelled'));
});

module.exports = { applyLeave, listLeaves, getLeave, decideLeave, cancelLeave };