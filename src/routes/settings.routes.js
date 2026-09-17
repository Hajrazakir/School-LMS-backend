const express = require('express');
const { verifyJWT, authorizeRoles } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate');
const controller = require('../controllers/settings.controller');
const { updateSettingsSchema } = require('../validators/settings.validator');

/**
 * School Settings (Section 3.19)
 */
const router = express.Router();

router.use(verifyJWT);

router.get('/', controller.getSettings);
router.patch('/', authorizeRoles('super_admin', 'school_admin'), validate(updateSettingsSchema), controller.updateSettings);

module.exports = router;
