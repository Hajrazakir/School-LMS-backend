const express = require('express');
const { verifyJWT, authorizeRoles } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate');
const controller = require('../controllers/assignment.controller');
const {
  createAssignmentSchema,
  updateAssignmentSchema,
  submitAssignmentSchema,
  gradeSubmissionSchema,
} = require('../validators/assignment.validator');

/**
 * Assignment and Homework Module (Section 3.16)
 */
const router = express.Router();

router.use(verifyJWT);

const staffOnly = authorizeRoles('super_admin', 'school_admin', 'teacher');
const studentOnly = authorizeRoles('student');

router.post('/', staffOnly, validate(createAssignmentSchema), controller.createAssignment);
router.get('/', controller.listAssignments);
router.get('/:id', controller.getAssignment);
router.patch('/:id', staffOnly, validate(updateAssignmentSchema), controller.updateAssignment);
router.delete('/:id', staffOnly, controller.deleteAssignment);

router.post('/:id/submit', studentOnly, validate(submitAssignmentSchema), controller.submitAssignment);
router.patch('/:id/grade', staffOnly, validate(gradeSubmissionSchema), controller.gradeSubmission);

module.exports = router;
