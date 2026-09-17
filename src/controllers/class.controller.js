const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { Class } = require('../models');

function toClientShape(classDoc) {
  const c = classDoc.toObject ? classDoc.toObject() : classDoc;
  return {
    id: c._id,
    name: c.name,
    sections: c.sections,
    academicSession: c.academicSession,
    classTeacher: c.classTeacher,
  };
}

const createClass = asyncHandler(async (req, res) => {
  const b = req.body;
  const school = req.user.school;
  if (!school) throw ApiError.badRequest('Your account is not linked to a school');

  const existing = await Class.findOne({ school, name: b.name, academicSession: b.academicSession });
  if (existing) throw ApiError.conflict('A class with this name already exists for this session');

  const klass = await Class.create({
    school,
    name: b.name,
    sections: b.sections,
    academicSession: b.academicSession,
    classTeacher: b.classTeacher,
  });

  return res.status(201).json(new ApiResponse(201, { class: toClientShape(klass) }, 'Class created successfully'));
});

const listClasses = asyncHandler(async (req, res) => {
  const classes = await Class.find({ school: req.user.school }).sort({ name: 1 });
  return res.status(200).json(new ApiResponse(200, { classes: classes.map(toClientShape) }, 'Classes fetched'));
});

const getClass = asyncHandler(async (req, res) => {
  const klass = await Class.findOne({ _id: req.params.id, school: req.user.school });
  if (!klass) throw ApiError.notFound('Class not found');
  return res.status(200).json(new ApiResponse(200, { class: toClientShape(klass) }, 'Class fetched'));
});

const updateClass = asyncHandler(async (req, res) => {
  const klass = await Class.findOne({ _id: req.params.id, school: req.user.school });
  if (!klass) throw ApiError.notFound('Class not found');
  const b = req.body;

  const fields = ['name', 'sections', 'academicSession', 'classTeacher'];
  fields.forEach((f) => { if (b[f] !== undefined) klass[f] = b[f]; });
  await klass.save();

  return res.status(200).json(new ApiResponse(200, { class: toClientShape(klass) }, 'Class updated'));
});

const deleteClass = asyncHandler(async (req, res) => {
  const klass = await Class.findOne({ _id: req.params.id, school: req.user.school });
  if (!klass) throw ApiError.notFound('Class not found');
  await klass.deleteOne();
  return res.status(200).json(new ApiResponse(200, null, 'Class deleted'));
});

module.exports = { createClass, listClasses, getClass, updateClass, deleteClass };