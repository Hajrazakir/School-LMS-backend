const { z } = require('zod');

const updateUserSchema = z.object({
  fullName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6),
});

const setStatusSchema = z.object({
  isActive: z.boolean(),
});

module.exports = { updateUserSchema, resetPasswordSchema, setStatusSchema };