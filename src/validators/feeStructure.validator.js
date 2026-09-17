const { z } = require('zod');

const componentsSchema = z
  .object({
    admission: z.number().nonnegative().optional(),
    tuition: z.number().nonnegative().optional(),
    examination: z.number().nonnegative().optional(),
    transport: z.number().nonnegative().optional(),
    laboratory: z.number().nonnegative().optional(),
    library: z.number().nonnegative().optional(),
  })
  .optional();

const discountItemSchema = z.object({
  label: z.string().optional(),
  type: z.enum(['flat', 'percent']),
  value: z.number().nonnegative(),
});

const createFeeStructureSchema = z.object({
  class: z.string().min(1),
  academicSession: z.string().optional(),
  components: componentsSchema,
  lateFine: z
    .object({
      flatAmount: z.number().nonnegative().optional(),
      percent: z.number().nonnegative().optional(),
      gracePeriodDays: z.number().nonnegative().optional(),
    })
    .optional(),
  discounts: z.array(discountItemSchema).optional(),
  scholarships: z.array(discountItemSchema).optional(),
});

const updateFeeStructureSchema = createFeeStructureSchema.partial();

module.exports = { createFeeStructureSchema, updateFeeStructureSchema };