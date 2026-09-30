import z from "zod";

export const EnrollmentValidation = z.object({ sectionId: z.string().uuid() });

export const EnrollmentListValidation = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.string().optional(),
  sectionId: z.string().uuid().optional(),
});
