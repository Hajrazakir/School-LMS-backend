const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { FeeStructure } = require('../models');

const createFeeStructure = asyncHandler(async (req, res) => {
  const b = req.body;
  const school = req.user.school;

  try {
    const structure = await FeeStructure.create({
      school,
      class: b.class,
      academicSession: b.academicSession,
      components: b.components,
      lateFine: b.lateFine,
      discounts: b.discounts,
      scholarships: b.scholarships,
      createdBy: req.user._id,
    });
    return res.status(201).json(new ApiResponse(201, { feeStructure: structure }, 'Fee structure created'));
  } catch (err) {
    if (err.code === 11000) throw ApiError.conflict('A fee structure already exists for this class and session');
    throw err;
  }
});

const listFeeStructures = asyncHandler(async (req, res) => {
  const filter = { school: req.user.school };
  if (req.query.class) filter.class = req.query.class;
  const structures = await FeeStructure.find(filter).populate('class').sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, { feeStructures: structures }, 'Fee structures fetched'));
});

const getFeeStructure = asyncHandler(async (req, res) => {
  const structure = await FeeStructure.findOne({ _id: req.params.id, school: req.user.school }).populate('class');
  if (!structure) throw ApiError.notFound('Fee structure not found');
  return res.status(200).json(new ApiResponse(200, { feeStructure: structure }, 'Fee structure fetched'));
});

const updateFeeStructure = asyncHandler(async (req, res) => {
  const structure = await FeeStructure.findOne({ _id: req.params.id, school: req.user.school });
  if (!structure) throw ApiError.notFound('Fee structure not found');
  const b = req.body;

  ['class', 'academicSession', 'components', 'lateFine', 'discounts', 'scholarships'].forEach((f) => {
    if (b[f] !== undefined) structure[f] = b[f];
  });
  await structure.save();

  return res.status(200).json(new ApiResponse(200, { feeStructure: structure }, 'Fee structure updated'));
});

module.exports = { createFeeStructure, listFeeStructures, getFeeStructure, updateFeeStructure };