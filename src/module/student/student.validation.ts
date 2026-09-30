import z from "zod";

const id = z.string().uuid();
const nullableId = id.nullable().optional();

export const StudentCreateValidation = z.object({
  userId: id,
  studentId: z.string().trim().min(2).max(50),
  programId: nullableId,
  departmentId: nullableId,
  currentSemesterId: nullableId,
  batchYear: z.coerce.number().int().min(1900).max(2100).nullable().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).nullable().optional(),
  dateOfBirth: z.coerce.date().nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
  guardianName: z.string().trim().max(120).nullable().optional(),
  guardianPhone: z.string().trim().max(30).nullable().optional(),
  admissionDate: z.coerce.date().nullable().optional(),
});

export const StudentUpdateValidation = StudentCreateValidation.omit({
  userId: true,
  studentId: true,
}).extend({
  userId: id.optional(),
  studentId: z.string().trim().min(2).max(50).optional(),
});
