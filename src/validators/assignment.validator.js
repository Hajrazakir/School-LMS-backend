const { z } = require('zod');

const createAssignmentSchema = z.object({
  class: z.string().min(1),
  section: z.string().min(1),
  subject: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  attachmentUrls: z.array(z.string()).optional(),
  deadline: z.string().min(1),
  teacher: z.string().optional(), // required only if the caller isn't a teacher account
});

const updateAssignmentSchema = createAssignmentSchema.partial();

const submitAssignmentSchema = z.object({
  fileUrl: z.string().min(1),
});

const gradeSubmissionSchema = z.object({
  student: z.string().min(1),
  marks: z.number().nonnegative(),
  feedback: z.string().optional(),
});

module.exports = {
  createAssignmentSchema,
  updateAssignmentSchema,
  submitAssignmentSchema,
  gradeSubmissionSchema,
};