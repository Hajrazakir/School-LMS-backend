const { z } = require('zod');

const generateChallanSchema = z.object({
  student: z.string().min(1),
  billingMonth: z.string().min(1), // e.g. "2026-09"
  dueDate: z.string().min(1),
});

const generateBatchChallanSchema = z.object({
  class: z.string().min(1),
  section: z.string().optional(),
  billingMonth: z.string().min(1),
  dueDate: z.string().min(1),
});

const collectPaymentSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(['jazzcash', 'easypaisa', 'raast', 'card', 'manual_bank_deposit', 'cash']),
  transactionId: z.string().optional(),
  bankName: z.string().optional(),
});

module.exports = { generateChallanSchema, generateBatchChallanSchema, collectPaymentSchema };