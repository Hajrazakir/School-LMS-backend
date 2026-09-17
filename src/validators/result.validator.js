const { z } = require('zod');

const enterMarksSchema = z.object({
  examination: z.string().min(1),
  student: z.string().min(1),
  subjectMarks: z
    .array(
      z.object({
        subject: z.string().min(1),
        obtainedMarks: z.number().nonnegative(),
        remarks: z.string().optional(),
      })
    )
    .min(1),
});

const rejectResultSchema = z.object({
  reason: z.string().optional(),
});

module.exports = { enterMarksSchema, rejectResultSchema };