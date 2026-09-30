import z from "zod";
export const ResultValidation = z.object({
  examId: z.string().uuid(),
  studentId: z.string().uuid(),
  enrollmentId: z.string().uuid(),
  marksObtained: z.number().nonnegative(),
});
export const ResultListValidation = z.object({
  examId: z.string().uuid().optional(),
});
