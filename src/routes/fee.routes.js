const express = require('express');
const { verifyJWT, authorizeRoles } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate');
const feeStructureController = require('../controllers/feeStructure.controller');
const { createFeeStructureSchema, updateFeeStructureSchema } = require('../validators/feeStructure.validator');
const challanController = require('../controllers/feeChallan.controller');
const {
  generateChallanSchema,
  generateBatchChallanSchema,
  collectPaymentSchema,
} = require('../validators/feeChallan.validator');

/**
 * Student Fee Management (Section 3.8)
 */
const router = express.Router();

router.use(verifyJWT);
router.use(authorizeRoles('super_admin', 'school_admin', 'accountant'));

// --- Fee Structures (per class/session) ---
router.post('/structures', validate(createFeeStructureSchema), feeStructureController.createFeeStructure);
router.get('/structures', feeStructureController.listFeeStructures);
router.get('/structures/:id', feeStructureController.getFeeStructure);
router.patch('/structures/:id', validate(updateFeeStructureSchema), feeStructureController.updateFeeStructure);

// --- Challans ---
router.post('/challans', validate(generateChallanSchema), challanController.generateChallan);
router.post('/challans/batch', validate(generateBatchChallanSchema), challanController.generateBatchChallans);
router.get('/challans', challanController.listChallans);
router.get('/challans/:id', challanController.getChallan);
router.post('/challans/:id/collect-payment', validate(collectPaymentSchema), challanController.collectPayment);

// --- Payment ledger (read-only view; online-gateway flows are handled separately in payment.routes.js) ---
router.get('/payments', challanController.listPayments);

module.exports = router;