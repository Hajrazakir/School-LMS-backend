const { z } = require('zod');

const updateSettingsSchema = z.object({
  name: z.string().min(1).optional(),
  currentAcademicSession: z.string().optional(),
  policies: z
    .object({
      attendance: z.object({ lateThresholdMinutes: z.number().nonnegative().optional() }).optional(),
      salaryDeduction: z
        .object({
          allowedAbsencesPerMonth: z.number().nonnegative().optional(),
          perDayDeductionRate: z.number().nonnegative().optional(),
          lateArrivalPenalty: z.number().nonnegative().optional(),
          halfDayDeduction: z.number().nonnegative().optional(),
        })
        .optional(),
      fee: z
        .object({ lateFineFlat: z.number().nonnegative().optional(), lateFinePercent: z.number().nonnegative().optional() })
        .optional(),
      grading: z
        .object({
          scheme: z.string().optional(),
          gradeBands: z.array(z.object({ min: z.number(), grade: z.string() })).optional(),
        })
        .optional(),
      workingDays: z.array(z.string()).optional(),
      standardWorkingHours: z.number().positive().optional(),
      gracePeriodMinutes: z.number().nonnegative().optional(),
      currency: z.string().optional(),
      timezone: z.string().optional(),
    })
    .optional(),
});

module.exports = { updateSettingsSchema };