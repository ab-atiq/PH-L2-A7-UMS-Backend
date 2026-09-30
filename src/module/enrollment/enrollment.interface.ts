import { EnrollmentStatus, Role } from "../../../generated/prisma/enums.js";

export type EnrollmentCreateData = {
  sectionId: string;
};

export type EnrollmentListQuery = {
  page?: number;
  limit?: number;
  status?: string;
  sectionId?: string;
  sortOrder?: "asc" | "desc";
};

export type EnrollmentListContext = {
  userId: string;
  role: Role;
  query: EnrollmentListQuery;
};

export type EnrollmentStatusFilter = EnrollmentStatus;
