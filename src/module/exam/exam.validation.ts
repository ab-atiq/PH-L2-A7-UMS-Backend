import z from "zod";
const id = z.string().uuid();
export const ExamValidation = z.object({
  sectionId: id,
  examType: z.enum(["QUIZ", "ASSIGNMENT", "MIDTERM", "FINAL", "PROJECT"]),
  title: z.string().trim().max(160).nullable().optional(),
  examDate: z.coerce.date(),
  totalMarks: z.number().positive(),
  weightage: z.number().positive().max(100).nullable().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "COMPLETED", "CANCELLED"]).optional(),
});
