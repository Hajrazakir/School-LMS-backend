const express = require('express');
const { verifyJWT, authorizeRoles } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate');
const notImplemented = require('../middlewares/notImplemented');
const controller = require('../controllers/teacherAttendance.controller');
const { markManualSchema } = require('../validators/teacherAttendance.validator');

/**
 * Teacher Biometric Attendance (Section 3.6)
 */
const router = express.Router();

// --- Device gateway ingestion endpoint (FR-6.1) ---
// Still scaffolded only: needs device-API-key auth (env.biometric.deviceApiKey),
// separate from normal user login, so it's intentionally left for a later phase.
router.post('/device-events', notImplemented('Biometric device check-in/check-out ingestion (FR-6.1)'));

// --- Authenticated (admin/accountant) manual fallback + views ---
router.use(verifyJWT);
router.use(authorizeRoles('super_admin', 'school_admin', 'accountant'));

router.post('/manual', validate(markManualSchema), controller.markManual);
router.get('/', controller.listAttendance);

module.exports = router;