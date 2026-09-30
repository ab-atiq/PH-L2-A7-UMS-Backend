import z from "zod";

const id = z.string().uuid();
export const createInvoiceSchema = z.object({
  studentId: id,
  semesterId: id.nullable().optional(),
  description: z.string().trim().min(2).max(300),
  amount: z.coerce.number().positive(),
  dueDate: z.coerce.date(),
});

export const invoiceListSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(["PENDING", "PAID", "OVERDUE", "CANCELLED"]).optional(),
});
