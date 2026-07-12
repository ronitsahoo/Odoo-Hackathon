import { validationResult } from 'express-validator';

/**
 * Run after a chain of express-validator rules. If any failed, respond 400
 * with the standard error envelope so the client can map messages to fields.
 * Usage: router.post('/', createItemRules, validate, controller.create)
 */
export const validate = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result.array().map((e) => ({ field: e.path, message: e.msg }));
  return res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors,
  });
};
