const ApiError = require('../utils/ApiError');

/**
 * Used on route stubs for modules that are scaffolded (model + route path
 * exist per the SRS) but whose business logic hasn't been implemented yet.
 * Returns a clear 501 instead of a silent 404, so the frontend/team knows
 * the endpoint is planned, not missing.
 */
const notImplemented = (moduleLabel) => (_req, _res, next) => {
  next(ApiError.notImplemented(`${moduleLabel} is scaffolded but not yet implemented.`));
};

module.exports = notImplemented;
