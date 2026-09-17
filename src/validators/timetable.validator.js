const { z } = require('zod');

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const createPeriodSchema = z
  .object({
    class: z.string().min(1),
    section: z.string().min(1),
    subject: z.string().min(1),
    teacher: z.string().min(1),
    room: z.string().optional(),
    day: z.enum(DAYS),
    startTime: z.string().regex(TIME_RE, 'startTime must be in 24h HH:mm format'),
    endTime: z.string().regex(TIME_RE, 'endTime must be in 24h HH:mm format'),
  })
  .refine((data) => data.startTime < data.endTime, { message: 'endTime must be after startTime', path: ['endTime'] });

const updatePeriodSchema = z.object({
  class: z.string().min(1).optional(),
  section: z.string().min(1).optional(),
  subject: z.string().min(1).optional(),
  teacher: z.string().min(1).optional(),
  room: z.string().optional(),
  day: z.enum(DAYS).optional(),
  startTime: z.string().regex(TIME_RE, 'startTime must be in 24h HH:mm format').optional(),
  endTime: z.string().regex(TIME_RE, 'endTime must be in 24h HH:mm format').optional(),
});

module.exports = { createPeriodSchema, updatePeriodSchema };