const { z } = require('zod');

const applyLeaveSchema = z.object({
  leaveType: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  reason: z.string().min(1),
  supportingDocumentUrl: z.string().optional(),
});

const decideLeaveSchema = z.object({
  status: z.enum(['approved', 'rejected']),
});

module.exports = { applyLeaveSchema, decideLeaveSchema };