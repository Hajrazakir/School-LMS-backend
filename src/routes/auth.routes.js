const express = require('express');
const authController = require('../controllers/auth.controller');
const { verifyJWT, authorizeRoles } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate');
const { authLimiter } = require('../middlewares/rateLimiter');
const { uploadImage } = require('../middlewares/upload');
const {
  createUserSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyEmailSchema,
  updateProfileSchema,
} = require('../validators/auth.validator');

const router = express.Router();

// --- Public (no self-registration - FR-1.2) ---
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh-token', authController.refreshAccessToken);
router.post('/verify-email', validate(verifyEmailSchema), authController.verifyEmail);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), authController.resetPassword);

// --- Admin-only account provisioning (FR-1.2) ---
router.post(
  '/register',
  verifyJWT,
  authorizeRoles('super_admin', 'school_admin'),
  validate(createUserSchema),
  authController.registerUser
);

router.patch(
  '/users/:userId/status',
  verifyJWT,
  authorizeRoles('super_admin', 'school_admin'),
  authController.setUserActiveStatus
);

router.delete(
  '/users/:userId',
  verifyJWT,
  authorizeRoles('super_admin', 'school_admin'),
  authController.deleteUser
);

// --- Authenticated self-service (any logged-in user) ---
router.get('/me', verifyJWT, authController.getMe);
router.post('/logout', verifyJWT, authController.logout);
router.post('/logout-all', verifyJWT, authController.logoutAllDevices);
router.post('/change-password', verifyJWT, validate(changePasswordSchema), authController.changePassword);
router.patch('/profile', verifyJWT, validate(updateProfileSchema), authController.updateProfile);
router.patch(
  '/profile/image',
  verifyJWT,
  uploadImage.single('profileImage'),
  authController.updateProfileImage
);

module.exports = router;
