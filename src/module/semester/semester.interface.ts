import { SemesterStatus } from "../../../generated/prisma/enums.js";

export type SemesterListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export type SemesterCreateData = {
  name: string;
  startDate: Date;
  endDate: Date;
  registrationStart: Date;
  registrationEnd: Date;
  status?: SemesterStatus;
};

export type SemesterUpdateData = {
  name?: string;
  startDate?: Date;
  endDate?: Date;
  registrationStart?: Date;
  registrationEnd?: Date;
  status?: SemesterStatus;
};
