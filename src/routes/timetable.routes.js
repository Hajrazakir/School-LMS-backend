const express = require('express');
const { verifyJWT, authorizeRoles } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate');
const controller = require('../controllers/timetable.controller');
const { createPeriodSchema, updatePeriodSchema } = require('../validators/timetable.validator');

/**
 * Timetable Management (Section 3.15)
 */
const router = express.Router();

router.use(verifyJWT);

const staffOnly = authorizeRoles('super_admin', 'school_admin');

router.post('/', staffOnly, validate(createPeriodSchema), controller.createPeriod);
router.get('/', controller.listPeriods);
router.get('/:id', controller.getPeriod);
router.patch('/:id', staffOnly, validate(updatePeriodSchema), controller.updatePeriod);
router.delete('/:id', staffOnly, controller.deletePeriod);

module.exports = router;
