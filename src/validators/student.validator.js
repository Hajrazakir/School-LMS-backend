const { z } = require('zod');

const createStudentSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional().default(''),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),

  rollNumber: z.string().min(1),
  class: z.string().min(1), // Class _id
  section: z.string().min(1),

  gender: z.enum(['male', 'female', 'other']).optional(),
  dateOfBirth: z.string().optional(),
  admissionDate: z.string().optional(),
});

const updateStudentSchema = createStudentSchema.partial().omit({ password: true });

module.exports = { createStudentSchema, updateStudentSchema };