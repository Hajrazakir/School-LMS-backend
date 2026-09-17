const { z } = require('zod');

const generateSalarySchema = z.object({
  teacher: z.string().min(1),
  month: z.string().min(1), // e.g. "2026-09"
});

const generateBatchSalarySchema = z.object({
  month: z.string().min(1),
});

const disburseSalarySchema = z.object({
  method: z.enum(['bank_transfer', 'jazzcash', 'easypaisa', 'raast']),
});

module.exports = { generateSalarySchema, generateBatchSalarySchema, disburseSalarySchema };