import z from "zod";

export const UpdateMyProfileSchema = z
  .object({
    firstName: z.string().min(2).max(50),
    lastName: z.string().min(2).max(50),
    phone: z
      .string()
      .trim()
      .refine((val) => val === "" || /^(?:\+?880|0)1[3-9]\d{8}$/.test(val), {
        message: "Please provide valid Bangladeshi number",
      })
      .optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one profile field is required",
  });

export const AdminUserListValidation = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  role: z.enum(["ADMIN", "FACULTY", "STUDENT", "USER"]).optional(),
  status: z
    .enum(["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING_VERIFICATION"])
    .optional(),
  includeDeleted: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});

export const AdminUserUpdateValidation = z
  .object({
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
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one profile field is required",
  });

export const AdminUserStatusValidation = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING_VERIFICATION"]),
});
