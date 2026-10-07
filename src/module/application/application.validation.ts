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

export type CreateRoleApplication = z.infer<
  typeof CreateRoleApplicationSchema
>;
