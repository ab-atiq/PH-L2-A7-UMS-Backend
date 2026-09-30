import type { PaymentGateway, Role } from "../../../generated/prisma/enums.js";

export type InitiatePaymentData = {
  invoiceId: string;
  gateway: PaymentGateway;
};

export type CheckoutPaymentData = {
  invoiceId: string;
};

export type PaymentContext = {
  userId: string;
  role: Role;
};
