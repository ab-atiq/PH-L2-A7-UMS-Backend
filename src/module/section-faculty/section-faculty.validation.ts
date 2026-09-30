import z from "zod";
export const SectionFacultyValidation = z.object({
  facultyId: z.string().uuid(),
  isPrimary: z.boolean().optional(),
});
