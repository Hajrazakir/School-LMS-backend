const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { Result, Examination, School } = require('../models');

const DEFAULT_GRADE_BANDS = [
  { min: 90, grade: 'A+' },
  { min: 80, grade: 'A' },
  { min: 70, grade: 'B' },
  { min: 60, grade: 'C' },
  { min: 50, grade: 'D' },
  { min: 0, grade: 'F' },
];

function gradeForPercentage(pct, bands) {
  const list = bands && bands.length ? bands : DEFAULT_GRADE_BANDS;
  const sorted = [...list].sort((a, b) => b.min - a.min);
  const hit = sorted.find((b) => pct >= b.min);
  return hit ? hit.grade : 'F';
}

/**
 * Fills in each subject's totalMarks/passingMarks from the Examination config,
 * then computes per-subject grade + the overall percentage/grade/pass-fail
 * automatically (FR-7.3) — this runs every time marks are entered, not just
 * on approval, so the teacher sees a live percentage while typing.
 */
function computeMetrics(subjectMarksInput, examination, gradeBands) {
  const subjectMarks = subjectMarksInput.map((sm) => {
    const cfg = examination.subjects.find((s) => String(s.subject) === String(sm.subject));
    if (!cfg) throw ApiError.badRequest(`Subject ${sm.subject} is not part of this examination`);
    if (sm.obtainedMarks > cfg.totalMarks) {
      throw ApiError.badRequest(`Obtained marks for a subject cannot exceed its total marks (${cfg.totalMarks})`);
    }
    const pct = (sm.obtainedMarks / cfg.totalMarks) * 100;
    return {
      subject: sm.subject,
      obtainedMarks: sm.obtainedMarks,
      totalMarks: cfg.totalMarks,
      grade: gradeForPercentage(pct, gradeBands),
      remarks: sm.remarks,
    };
  });

  const totalObtained = subjectMarks.reduce((sum, s) => sum + s.obtainedMarks, 0);
  const totalMax = subjectMarks.reduce((sum, s) => sum + s.totalMarks, 0);
  const percentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 10000) / 100 : 0;
  const overallGrade = gradeForPercentage(percentage, gradeBands);

  const failedAnySubject = subjectMarks.some((sm) => {
    const cfg = examination.subjects.find((s) => String(s.subject) === String(sm.subject));
    return sm.obtainedMarks < cfg.passingMarks;
  });
  const passFail = failedAnySubject ? 'fail' : 'pass';

  return { subjectMarks, totalObtained, totalMax, percentage, overallGrade, passFail };
}

/** Teacher/admin enters or edits marks; percentage/grade recompute automatically every save. */
const enterMarks = asyncHandler(async (req, res) => {
  const { examination: examId, student, subjectMarks } = req.body;
  const school = req.user.school;

  const examination = await Examination.findOne({ _id: examId, school });
  if (!examination) throw ApiError.notFound('Examination not found');

  const schoolDoc = await School.findById(school);
  const gradeBands = schoolDoc?.policies?.grading?.gradeBands;

  const metrics = computeMetrics(subjectMarks, examination, gradeBands);

  const result = await Result.findOneAndUpdate(
    { examination: examId, student },
    {
      $set: {
        school,
        examination: examId,
        student,
        subjectMarks: metrics.subjectMarks,
        totalObtained: metrics.totalObtained,
        totalMax: metrics.totalMax,
        percentage: metrics.percentage,
        overallGrade: metrics.overallGrade,
        passFail: metrics.passFail,
      },
      $setOnInsert: { status: 'draft' },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return res.status(200).json(new ApiResponse(200, { result }, 'Marks saved, percentage calculated automatically'));
});

const listResults = asyncHandler(async (req, res) => {
  const filter = { school: req.user.school };
  if (req.query.examination) filter.examination = req.query.examination;
  if (req.query.student) filter.student = req.query.student;
  if (req.query.status) filter.status = req.query.status;

  const results = await Result.find(filter).populate('student').populate('examination').sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, { results }, 'Results fetched'));
});

const getResult = asyncHandler(async (req, res) => {
  const result = await Result.findOne({ _id: req.params.id, school: req.user.school })
    .populate('student')
    .populate('examination');
  if (!result) throw ApiError.notFound('Result not found');
  return res.status(200).json(new ApiResponse(200, { result }, 'Result fetched'));
});

/** Teacher submits their entered marks for admin review. */
const submitForApproval = asyncHandler(async (req, res) => {
  const result = await Result.findOne({ _id: req.params.id, school: req.user.school });
  if (!result) throw ApiError.notFound('Result not found');
  if (result.status !== 'draft') throw ApiError.badRequest('Only draft results can be submitted for approval');
  result.status = 'pending_approval';
  await result.save();
  return res.status(200).json(new ApiResponse(200, { result }, 'Submitted for approval'));
});

/** Admin approves the marks (per-subject sign-off); still requires a separate publish step to reach students. */
const approveResult = asyncHandler(async (req, res) => {
  const result = await Result.findOne({ _id: req.params.id, school: req.user.school });
  if (!result) throw ApiError.notFound('Result not found');
  if (result.status !== 'pending_approval') throw ApiError.badRequest('Only results pending approval can be approved');

  result.subjectMarks.forEach((sm) => {
    sm.approvedBy = req.user._id;
    sm.approvedAt = new Date();
  });
  await result.save();

  return res.status(200).json(new ApiResponse(200, { result }, 'Result approved'));
});

/** Admin rejects — sends it back to the teacher for correction. */
const rejectResult = asyncHandler(async (req, res) => {
  const result = await Result.findOne({ _id: req.params.id, school: req.user.school });
  if (!result) throw ApiError.notFound('Result not found');
  if (result.status !== 'pending_approval') throw ApiError.badRequest('Only results pending approval can be rejected');

  result.status = 'draft';
  result.subjectMarks.forEach((sm) => {
    sm.approvedBy = undefined;
    sm.approvedAt = undefined;
    if (req.body.reason) sm.remarks = req.body.reason;
  });
  await result.save();

  return res.status(200).json(new ApiResponse(200, { result }, 'Result rejected and sent back to draft'));
});

/** Publishes every approved result for an examination and computes class rank/position. */
const publishExamResults = asyncHandler(async (req, res) => {
  const examId = req.params.examId;
  const approved = await Result.find({
    examination: examId,
    school: req.user.school,
    status: 'pending_approval',
    'subjectMarks.approvedBy': { $exists: true },
  }).sort({ totalObtained: -1 });

  if (!approved.length) throw ApiError.badRequest('No approved results are ready to publish for this examination');

  await Promise.all(
    approved.map((r, index) => {
      r.status = 'published';
      r.classPosition = index + 1;
      return r.save();
    })
  );

  return res.status(200).json(new ApiResponse(200, { publishedCount: approved.length }, 'Results published'));
});

module.exports = {
  enterMarks,
  listResults,
  getResult,
  submitForApproval,
  approveResult,
  rejectResult,
  publishExamResults,
};