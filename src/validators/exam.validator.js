const { z } = require('zod');

const subjectEntrySchema = z.object({
  subject: z.string().min(1),
  date: z.string().min(1),
  totalMarks: z.number().positive(),
  passingMarks: z.number().nonnegative(),
});

const createExamSchema = z.object({
  title: z.string().min(1),
  class: z.string().min(1),
  academicSession: z.string().optional(),
  subjects: z.array(subjectEntrySchema).min(1),
});

const updateExamSchema = createExamSchema.partial();

const setExamStatusSchema = z.object({
  status: z.enum(['scheduled', 'ongoing', 'completed', 'published']),
});

module.exports = { createExamSchema, updateExamSchema, setExamStatusSchema };