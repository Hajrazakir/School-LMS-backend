const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { User, Parent, Student } = require('../models');

function toClientShape(parentDoc) {
  const p = parentDoc.toObject ? parentDoc.toObject() : parentDoc;
  const u = p.user && p.user.fullName !== undefined ? p.user : null;
  return {
    id: p._id,
    name: u?.fullName,
    email: u?.email,
    phone: u?.phone,
    status: (u?.isActive ?? p.isActive) ? 'active' : 'inactive',
    relationship: p.relationship,
    children: p.children,
  };
}

/** School Admin/Accountant registers a parent + creates their login account, linking one or more children. */
const createParent = asyncHandler(async (req, res) => {
  const b = req.body;
  const creator = req.user;
  const school = creator.school;

  const existingUser = await User.findOne({ email: b.email });
  if (existingUser) throw ApiError.conflict('An account with this email already exists');

  if (b.children.length) {
    const count = await Student.countDocuments({ _id: { $in: b.children }, school });
    if (count !== b.children.length) throw ApiError.badRequest('One or more children were not found in this school');
  }

  const fullName = `${b.firstName} ${b.lastName || ''}`.trim();
  const user = new User({
    fullName,
    email: b.email,
    phone: b.phone,
    role: 'parent',
    school,
    isEmailVerified: true,
    isActive: true,
    createdBy: creator._id,
  });
  await user.setPassword(b.password);
  await user.save();

  const parent = await Parent.create({
    user: user._id,
    school,
    relationship: b.relationship,
    children: b.children,
  });

  const populated = await Parent.findById(parent._id).populate('user').populate('children');
  return res.status(201).json(new ApiResponse(201, { parent: toClientShape(populated) }, 'Parent registered successfully'));
});

const listParents = asyncHandler(async (req, res) => {
  const filter = { school: req.user.school };
  const parents = await Parent.find(filter).populate('user').populate('children').sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, { parents: parents.map(toClientShape) }, 'Parents fetched'));
});

const getParent = asyncHandler(async (req, res) => {
  const parent = await Parent.findOne({ _id: req.params.id, school: req.user.school }).populate('user').populate('children');
  if (!parent) throw ApiError.notFound('Parent not found');
  return res.status(200).json(new ApiResponse(200, { parent: toClientShape(parent) }, 'Parent fetched'));
});

const updateParent = asyncHandler(async (req, res) => {
  const parent = await Parent.findOne({ _id: req.params.id, school: req.user.school });
  if (!parent) throw ApiError.notFound('Parent not found');
  const b = req.body;

  if (b.children !== undefined) parent.children = b.children;
  if (b.relationship !== undefined) parent.relationship = b.relationship;
  await parent.save();

  if (b.firstName || b.lastName || b.phone) {
    const user = await User.findById(parent.user);
    if (b.firstName || b.lastName) user.fullName = `${b.firstName ?? ''} ${b.lastName ?? ''}`.trim() || user.fullName;
    if (b.phone !== undefined) user.phone = b.phone;
    await user.save();
  }

  const populated = await Parent.findById(parent._id).populate('user').populate('children');
  return res.status(200).json(new ApiResponse(200, { parent: toClientShape(populated) }, 'Parent updated'));
});

const deleteParent = asyncHandler(async (req, res) => {
  const parent = await Parent.findOne({ _id: req.params.id, school: req.user.school });
  if (!parent) throw ApiError.notFound('Parent not found');
  await User.findByIdAndDelete(parent.user);
  await parent.deleteOne();
  return res.status(200).json(new ApiResponse(200, null, 'Parent deleted'));
});

module.exports = { createParent, listParents, getParent, updateParent, deleteParent };