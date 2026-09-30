import z from "zod";

export const auditLogListSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  action: z.string().optional(),
  entity: z.string().optional(),
  actorId: z.string().uuid().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
