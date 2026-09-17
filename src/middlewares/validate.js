const ApiError = require('../utils/ApiError');

/**
 * Validates req.body/query/params against a Zod schema.
 * Usage: router.post('/login', validate(loginSchema), authController.login)
 */
const validate = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const details = result.error.flatten().fieldErrors;
    return next(ApiError.badRequest('Validation failed', details));
  }
  req.body = result.data;
  next();
};

module.exports = validate;
