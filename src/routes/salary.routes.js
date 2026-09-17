const express = require('express');
const { verifyJWT, authorizeRoles } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate');
const controller = require('../controllers/salary.controller');
const {
  generateSalarySchema,
  generateBatchSalarySchema,
  disburseSalarySchema,
} = require('../validators/salary.validator');

/**
 * Teacher Salary Management (Section 3.11)
 */
const router = express.Router();

router.use(verifyJWT);

const staffOnly = authorizeRoles('super_admin', 'school_admin', 'accountant');

router.post('/generate', staffOnly, validate(generateSalarySchema), controller.generateSalary);
router.post('/generate-batch', staffOnly, validate(generateBatchSalarySchema), controller.generateBatchSalaries);
router.get('/', controller.listSalaries);
router.get('/:id', controller.getSalary);
router.patch('/:id/submit', staffOnly, controller.submitForApproval);
router.patch('/:id/approve', authorizeRoles('super_admin', 'school_admin'), controller.approveSalary);
router.patch('/:id/disburse', staffOnly, validate(disburseSalarySchema), controller.disburseSalary);

module.exports = router;
