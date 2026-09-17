const express = require("express");
const { verifyJWT } = require("../middlewares/auth.middleware");
const notImplemented = require("../middlewares/notImplemented");

/**
 * Student Portal (Section 3.3)
 * Route file scaffolded per the SRS. All endpoints require authentication.
 * Business logic (controllers/services) is not implemented yet - each
 * endpoint currently returns 501 Not Implemented via notImplemented().
 * Add controller functions here as this module is built, following the
 * pattern used in auth.routes.js / auth.controller.js.
 */
const router = express.Router();

router.use(verifyJWT);

router.get("/", notImplemented("Student Portal (Section 3.3)"));

module.exports = router;
