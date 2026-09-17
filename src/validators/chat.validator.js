const { z } = require('zod');

const startConversationSchema = z.object({
  teacher: z.string().min(1),
  student: z.string().min(1),
});

const sendMessageSchema = z
  .object({
    text: z.string().optional(),
    attachments: z
      .array(
        z.object({
          url: z.string().min(1),
          type: z.enum(['image', 'file']),
        })
      )
      .optional(),
  })
  .refine((d) => (d.text && d.text.trim().length > 0) || (d.attachments && d.attachments.length > 0), {
    message: 'Message must include text or at least one attachment',
  });

const reportMessageSchema = z.object({
  reason: z.string().min(1),
});

const restrictConversationSchema = z.object({
  isRestricted: z.boolean(),
});

module.exports = { startConversationSchema, sendMessageSchema, reportMessageSchema, restrictConversationSchema };