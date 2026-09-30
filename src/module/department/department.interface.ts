import { EntityStatus } from "../../../generated/prisma/enums.js";

export type DepartmentListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export type DepartmentCreateData = {
  name: string;
  code: string;
  description?: string | null;
  status?: EntityStatus;
};

export type DepartmentUpdateData = {
  name?: string;
  code?: string;
  description?: string | null;
  status?: EntityStatus;
};
