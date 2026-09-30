import z from "zod";
const id = z.string().uuid();

export const CoursePrerequisiteValidation = z.object({
  courseId: id,
  prerequisiteId: id,
});
