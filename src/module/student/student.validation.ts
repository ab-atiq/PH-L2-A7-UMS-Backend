import z from "zod";

const id = z.string().uuid();
const nullableId = id.nullable().optional();

export const StudentCreateValidation = z.object({
  userId: id,
  studentId: z.string().trim().min(2).max(50),
  programId: nullableId,
  departmentId: nullableId,
  currentProgramSemesterId: nullableId,
  batchYear: z.coerce.number().int().min(1900).max(2100).nullable().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).nullable().optional(),
  dateOfBirth: z.coerce.date().nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
  guardianName: z.string().trim().max(120).nullable().optional(),
  guardianPhone: z.string().trim().max(30).nullable().optional(),
  admissionDate: z.coerce.date().nullable().optional(),
});

const StudentUpdateBaseValidation = StudentCreateValidation.omit({
  userId: true,
  studentId: true,
}).extend({
  userId: id.optional(),
  studentId: z.string().trim().min(2).max(50).optional(),
});

export const StudentSelfProfileValidation = StudentCreateValidation.pick({
  gender: true,
  dateOfBirth: true,
  address: true,
  guardianName: true,
  guardianPhone: true,
});

export const StudentListValidation = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  departmentId: id.optional(),
  programId: id.optional(),
  currentProgramSemesterId: id.optional(),
  status: z
    .enum(["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING_VERIFICATION"])
    .optional(),
  includeDeleted: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});

export const StudentUpdateValidation = StudentUpdateBaseValidation.extend({
  firstName: z.string().trim().min(2).max(50).optional(),
  lastName: z.string().trim().min(2).max(50).optional(),
  phone: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^(?:\+?880|0)1[3-9]\d{8}$/.test(value),
      {
        message: "Please provide valid Bangladeshi number",
      },
    )
    .nullable()
    .optional(),
});
