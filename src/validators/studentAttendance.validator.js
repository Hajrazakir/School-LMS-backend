const { z } = require('zod');

const STATUSES = ['present', 'absent', 'late', 'on_leave', 'half_day'];

const markAttendanceSchema = z.object({
  class: z.string().min(1),
  section: z.string().min(1),
  subject: z.string().min(1),
  date: z.string().min(1),
  teacher: z.string().optional(), // required only if the caller isn't a teacher account
  records: z
    .array(
      z.object({
        student: z.string().min(1),
        status: z.enum(STATUSES),
        remarks: z.string().optional(),
      })
    )
    .min(1),
});

const updateAttendanceSchema = z.object({
  status: z.enum(STATUSES).optional(),
  remarks: z.string().optional(),
  reason: z.string().optional(),
});

module.exports = { markAttendanceSchema, updateAttendanceSchema };