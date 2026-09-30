import z from "zod";
const id = z.string().uuid();
export const ProgramValidation = z.object({
  name: z.string().trim().min(2).max(160),
  code: z
    .string()
    .trim()
    .min(2)
    .max(30)
    .transform((value) => value.toUpperCase()),
  departmentId: id,
  durationYears: z.number().int().positive(),
  totalCredits: z.number().int().positive(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});
export const ProgramListValidation = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  sortBy: z.string().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
