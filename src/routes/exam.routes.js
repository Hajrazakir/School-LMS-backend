const express = require('express');
const { verifyJWT, authorizeRoles } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate');
const examController = require('../controllers/exam.controller');
const { createExamSchema, updateExamSchema, setExamStatusSchema } = require('../validators/exam.validator');
const resultController = require('../controllers/result.controller');
const { enterMarksSchema, rejectResultSchema } = require('../validators/result.validator');

/**
 * Examination and Result Management (Section 3.7)
 */
const router = express.Router();

router.use(verifyJWT);

const staffOnly = authorizeRoles('super_admin', 'school_admin', 'teacher');
const adminOnly = authorizeRoles('super_admin', 'school_admin');

// --- Results (static paths declared BEFORE '/:id' so 'results' isn't swallowed as an id) ---
router.post('/results', staffOnly, validate(enterMarksSchema), resultController.enterMarks);
router.get('/results', resultController.listResults);
router.get('/results/:id', resultController.getResult);
router.patch('/results/:id/submit', staffOnly, resultController.submitForApproval);
router.patch('/results/:id/approve', adminOnly, resultController.approveResult);
router.patch('/results/:id/reject', adminOnly, validate(rejectResultSchema), resultController.rejectResult);
router.post('/:examId/publish-results', adminOnly, resultController.publishExamResults);

// --- Examinations ---
router.post('/', staffOnly, validate(createExamSchema), examController.createExam);
router.get('/', examController.listExams);
router.get('/:id', examController.getExam);
router.patch('/:id', staffOnly, validate(updateExamSchema), examController.updateExam);
router.patch('/:id/status', staffOnly, validate(setExamStatusSchema), examController.setExamStatus);
router.delete('/:id', adminOnly, examController.deleteExam);

module.exports = router;
