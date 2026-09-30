import z from "zod";

export const notificationListSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  isRead: z.coerce.boolean().optional(),
});

export const createNotificationSchema = z.object({
  userId: z.string().uuid(),
  type: z
    .enum(["INFO", "WARNING", "SUCCESS", "ERROR", "PAYMENT", "ACADEMIC"])
    .optional(),
  title: z.string().trim().min(2).max(160),
  message: z.string().trim().min(2).max(1000),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});
