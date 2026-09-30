import type { Role } from "../../../generated/prisma/enums.js";

export type InvoiceListQuery = {
  page?: number;
  limit?: number;
  status?: string;
};

export type InvoiceContext = {
  userId: string;
  role: Role;
  query: InvoiceListQuery;
};
