import z from "zod";
export const AttendanceValidation = z.object({
  enrollmentId: z.string().uuid(),
  classDate: z.coerce.date(),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
  remarks: z.string().trim().max(500).nullable().optional(),
});
