import z from "zod";

const id = z.string().uuid();
const dueDate = z.coerce.date();

export const createInvoiceSchema = z.discriminatedUnion("type", [
  z.object({
    studentId: id,
    type: z.literal("ADMISSION"),
    programId: id,
    dueDate,
  }),
  z.object({
    studentId: id,
    type: z.literal("SEMESTER"),
    semesterEnrollmentId: id,
    dueDate,
  }),
]);

export const invoiceListSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(["PENDING", "PAID", "OVERDUE", "CANCELLED"]).optional(),
});

export type CreateInvoiceData = z.infer<typeof createInvoiceSchema>;
