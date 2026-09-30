import z from "zod";

const id = z.string().uuid();
const employeeId = z.string().trim().min(2).max(50);

export const FacultyCreateValidation = z.object({
  employeeId,
  designation: z.string().trim().min(2).max(120),
  specialization: z.string().trim().max(160).nullable().optional(),
  departmentId: id.nullable().optional(),
  userId: id,
  joinDate: z.coerce.date().nullable().optional(),
});

export const FacultyUpdateValidation = z.object({
  employeeId: employeeId.optional(),
  designation: z.string().trim().min(2).max(120).optional(),
  specialization: z.string().trim().max(160).nullable().optional(),
  departmentId: id.nullable().optional(),
  userId: id.optional(),
  joinDate: z.coerce.date().nullable().optional(),
});

export const FacultyEmployeeIdValidation = z.object({ employeeId });
