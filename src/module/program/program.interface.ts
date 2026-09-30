import { EntityStatus } from "../../../generated/prisma/enums.js";

export type ProgramListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  departmentId?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export type ProgramCreateData = {
  name: string;
  code: string;
  departmentId: string;
  durationYears: number;
  totalCredits: number;
  status?: EntityStatus;
};

export type ProgramUpdateData = {
  name?: string;
  code?: string;
  departmentId?: string;
  durationYears?: number;
  totalCredits?: number;
  status?: EntityStatus;
};
