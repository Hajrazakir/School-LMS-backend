const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { School } = require('../models');

const getSettings = asyncHandler(async (req, res) => {
  const school = await School.findById(req.user.school);
  if (!school) throw ApiError.notFound('School not found');
  return res.status(200).json(new ApiResponse(200, { school }, 'Settings fetched'));
});

/** Deep-merges only the provided policy fields so unrelated settings are untouched. */
const updateSettings = asyncHandler(async (req, res) => {
  const school = await School.findById(req.user.school);
  if (!school) throw ApiError.notFound('School not found');
  const b = req.body;

  if (b.name !== undefined) school.name = b.name;
  if (b.currentAcademicSession !== undefined) school.currentAcademicSession = b.currentAcademicSession;

  if (b.policies) {
    Object.entries(b.policies).forEach(([section, value]) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        school.policies[section] = { ...(school.policies[section]?.toObject?.() ?? school.policies[section] ?? {}), ...value };
      } else {
        school.policies[section] = value;
      }
    });
  }

  await school.save();
  return res.status(200).json(new ApiResponse(200, { school }, 'Settings updated'));
});

module.exports = { getSettings, updateSettings };