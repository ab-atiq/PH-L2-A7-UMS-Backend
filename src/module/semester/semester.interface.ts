import type { EntityStatus } from "../../../generated/prisma/enums.js";

export type SemesterListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  programId?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export type SemesterCreateData = {
  programId: string;
  semesterNumber: number;
  name: string;
  status?: EntityStatus;
};

export type SemesterUpdateData = {
  name?: string;
  status?: EntityStatus;
};
