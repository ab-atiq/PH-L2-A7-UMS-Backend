import z from "zod";
const id = z.string().uuid();
export const SectionValidation = z.object({
  courseId: id,
  semesterId: id,
  sectionName: z.string().trim().min(1).max(30),
  capacity: z.coerce.number().int().positive(),
  room: z.string().trim().max(100).nullable().optional(),
  schedule: z.record(z.string(), z.unknown()).nullable().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "CLOSED", "CANCELLED"]).optional(),
});
export const SectionListValidation = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  status: z.string().optional(),
  sortBy: z.string().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
