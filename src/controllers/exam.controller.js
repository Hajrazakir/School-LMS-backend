const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { Examination } = require('../models');

const createExam = asyncHandler(async (req, res) => {
  const b = req.body;
  const school = req.user.school;

  const exam = await Examination.create({
    school,
    title: b.title,
    class: b.class,
    academicSession: b.academicSession,
    subjects: b.subjects,
  });

  return res.status(201).json(new ApiResponse(201, { exam }, 'Examination created'));
});

const listExams = asyncHandler(async (req, res) => {
  const filter = { school: req.user.school };
  if (req.query.class) filter.class = req.query.class;
  if (req.query.status) filter.status = req.query.status;

  const exams = await Examination.find(filter).populate('class').sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, { exams }, 'Examinations fetched'));
});

const getExam = asyncHandler(async (req, res) => {
  const exam = await Examination.findOne({ _id: req.params.id, school: req.user.school }).populate('class');
  if (!exam) throw ApiError.notFound('Examination not found');
  return res.status(200).json(new ApiResponse(200, { exam }, 'Examination fetched'));
});

const updateExam = asyncHandler(async (req, res) => {
  const exam = await Examination.findOne({ _id: req.params.id, school: req.user.school });
  if (!exam) throw ApiError.notFound('Examination not found');
  const b = req.body;

  ['title', 'class', 'academicSession', 'subjects'].forEach((f) => {
    if (b[f] !== undefined) exam[f] = b[f];
  });
  await exam.save();

  return res.status(200).json(new ApiResponse(200, { exam }, 'Examination updated'));
});

/** Draft -> Scheduled -> Ongoing -> Completed -> Published workflow. */
const setExamStatus = asyncHandler(async (req, res) => {
  const exam = await Examination.findOne({ _id: req.params.id, school: req.user.school });
  if (!exam) throw ApiError.notFound('Examination not found');
  exam.status = req.body.status;
  await exam.save();
  return res.status(200).json(new ApiResponse(200, { exam }, 'Examination status updated'));
});

const deleteExam = asyncHandler(async (req, res) => {
  const exam = await Examination.findOne({ _id: req.params.id, school: req.user.school });
  if (!exam) throw ApiError.notFound('Examination not found');
  await exam.deleteOne();
  return res.status(200).json(new ApiResponse(200, null, 'Examination deleted'));
});

module.exports = { createExam, listExams, getExam, updateExam, setExamStatus, deleteExam };