const express = require('express');
const { verifyJWT } = require('../middlewares/auth.middleware');
const notImplemented = require('../middlewares/notImplemented');
const { paymentLimiter } = require('../middlewares/rateLimiter');

/**
 * Online Fee Payment (Section 3.9)
 * Route file scaffolded per the SRS. Business logic is not implemented yet;
 * each endpoint currently returns 501 via notImplemented(). Add controller
 * functions here as this module is built.
 */
const router = express.Router();

// --- Webhook callbacks from payment gateways/banks (FR-9.5) ---
// Deliberately NOT behind verifyJWT: the caller is JazzCash/Easypaisa/the
// bank PSP/the card gateway, not a logged-in user. Authenticity must instead
// be verified inside the controller via each provider's signature/shared-secret
// scheme BEFORE any transaction is processed (FR-9.5, FR-9.7 duplicate check).
router.post('/webhook/jazzcash', paymentLimiter, notImplemented('JazzCash webhook handler'));
router.post('/webhook/easypaisa', paymentLimiter, notImplemented('Easypaisa webhook handler'));
router.post('/webhook/raast', paymentLimiter, notImplemented('Raast webhook handler'));
router.post('/webhook/card-gateway', paymentLimiter, notImplemented('Card gateway webhook handler'));

// --- Authenticated payment initiation (student/parent) ---
router.use(verifyJWT);
router.post('/initiate', paymentLimiter, notImplemented('Online Fee Payment (Section 3.9)'));
router.post('/manual-bank-deposit', notImplemented('Manual bank deposit submission (FR-9.4)'));
router.get('/', notImplemented('Online Fee Payment (Section 3.9)'));

module.exports = router;
