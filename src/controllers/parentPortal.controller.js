const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { Parent, StudentAttendance, Result, FeeChallan } = require('../models');

async function getOwnParentProfile(req) {
  const parent = await Parent.findOne({ user: req.user._id, school: req.user.school }).populate('children');
  if (!parent) throw ApiError.badRequest('No parent record is linked to your account');
  return parent;
}

async function assertOwnChild(req, childId) {
  const parent = await getOwnParentProfile(req);
  const owns = parent.children.some((c) => String(c._id) === String(childId));
  if (!owns) throw ApiError.forbidden('You can only view your own child\u2019s records');
  return parent;
}

const getMyChildren = asyncHandler(async (req, res) => {
  const parent = await getOwnParentProfile(req);
  return res.status(200).json(new ApiResponse(200, { children: parent.children }, 'Children fetched'));
});

const getChildAttendance = asyncHandler(async (req, res) => {
  await assertOwnChild(req, req.params.childId);
  const filter = { school: req.user.school, student: req.params.childId };
  if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) filter.date.$gte = new Date(req.query.from);
    if (req.query.to) filter.date.$lte = new Date(req.query.to);
  }
  const records = await StudentAttendance.find(filter).sort({ date: -1 });
  return res.status(200).json(new ApiResponse(200, { attendance: records }, 'Attendance fetched'));
});

const getChildResults = asyncHandler(async (req, res) => {
  await assertOwnChild(req, req.params.childId);
  const results = await Result.find({ school: req.user.school, student: req.params.childId, status: 'published' })
    .populate('examination')
    .sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, { results }, 'Results fetched'));
});

const getChildFees = asyncHandler(async (req, res) => {
  await assertOwnChild(req, req.params.childId);
  const challans = await FeeChallan.find({ school: req.user.school, student: req.params.childId }).sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, { challans }, 'Fee challans fetched'));
});

module.exports = { getMyChildren, getChildAttendance, getChildResults, getChildFees };