const { z } = require('zod');

const createParentSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional().default(''),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  relationship: z.enum(['father', 'mother', 'guardian']).optional(),
  children: z.array(z.string().min(1)).optional().default([]),
});

const updateParentSchema = createParentSchema.partial().omit({ password: true });

module.exports = { createParentSchema, updateParentSchema };