import z from "zod";

export const CreateRoleApplicationSchema = z.discriminatedUnion(
  "requestedRole",
  [
    z.object({
      requestedRole: z.literal("STUDENT"),
      programInterest: z.string().trim().min(2).max(160),
      statement: z.string().trim().min(20).max(2000),
    }),
    z.object({
      requestedRole: z.literal("FACULTY"),
      departmentInterest: z.string().trim().min(2).max(160),
      highestQualification: z.string().trim().min(2).max(160),
      specialization: z.string().trim().max(160).optional(),
      statement: z.string().trim().min(20).max(2000),
    }),
  ],
);

export type CreateRoleApplication = z.infer<typeof CreateRoleApplicationSchema>;

export const AdminApplicationListSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  requestedRole: z.enum(["STUDENT", "FACULTY"]).optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
});

export const AdminApplicationStatusSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
});

export type AdminApplicationListQuery = z.infer<
  typeof AdminApplicationListSchema
>;
