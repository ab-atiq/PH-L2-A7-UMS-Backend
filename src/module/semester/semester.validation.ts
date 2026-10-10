import z from "zod";

export const SemesterValidation = z.object({
  programId: z.string().uuid(),
  semesterNumber: z.number().int().positive(),
  name: z.string().trim().min(2).max(100),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const SemesterUpdateValidation = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const SemesterListValidation = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  programId: z.string().uuid().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  sortBy: z.string().default("semesterNumber"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});
