import z from "zod";

export const initiatePaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  gateway: z.enum(["STRIPE", "BKASH", "SSLCOMMERZ"]),
});

export const checkoutQuerySchema = z.object({
  invoiceId: z.string().uuid(),
});

export const bkashPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
});

export const webhookSchema = z.object({
  transactionId: z.string().min(3),
  status: z.enum(["SUCCESS", "FAILED", "CANCELLED", "PENDING"]),
  gatewayReference: z.string().optional(),
  gatewayResponse: z.record(z.string(), z.unknown()).optional(),
});
