const { z } = require('zod');

const createClassSchema = z.object({
  name: z.string().min(1),
  sections: z.array(z.string().min(1)).optional().default([]),
  academicSession: z.string().optional(),
  classTeacher: z.string().optional(), // Teacher _id
});

const updateClassSchema = createClassSchema.partial();

module.exports = { createClassSchema, updateClassSchema };