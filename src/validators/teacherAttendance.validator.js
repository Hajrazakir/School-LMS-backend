const { z } = require('zod');

const markManualSchema = z.object({
  teacher: z.string().min(1),
  date: z.string().min(1),
  status: z.enum(['present', 'absent', 'late', 'half_day', 'on_leave']),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
});

module.exports = { markManualSchema };