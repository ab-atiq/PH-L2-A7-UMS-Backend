import z from "zod";

export const SemesterCourseCreateValidation = z.object({
  courseId: z.string().uuid(),
  teacherId: z.string().uuid(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const SemesterCourseUpdateValidation =
  SemesterCourseCreateValidation.partial();
