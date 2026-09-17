const { z } = require('zod');

const NOTIFICATION_TYPES = [
  'exam_scheduled', 'result_published', 'holiday', 'attendance_absent', 'attendance_late',
  'fee_due', 'fee_overdue', 'fee_paid', 'salary_processed', 'leave_decision',
  'assignment_created', 'new_message', 'school_event', 'announcement',
];

const sendNotificationSchema = z
  .object({
    recipients: z.array(z.string().min(1)).optional(), // explicit list of User _ids
    role: z.enum(['super_admin', 'school_admin', 'accountant', 'teacher', 'student', 'parent']).optional(), // OR broadcast to a whole role
    type: z.enum(NOTIFICATION_TYPES).default('announcement'),
    title: z.string().min(1),
    message: z.string().min(1),
    relatedLink: z.string().optional(),
    isHighPriority: z.boolean().optional(),
  })
  .refine((d) => (d.recipients && d.recipients.length > 0) || d.role, {
    message: 'Provide either "recipients" (specific user ids) or "role" (broadcast to a whole role)',
  });

module.exports = { sendNotificationSchema };