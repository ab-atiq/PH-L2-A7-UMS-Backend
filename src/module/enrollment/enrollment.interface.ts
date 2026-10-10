import type { Role } from "../../../generated/prisma/enums.js";

export type EnrollmentCreateData = {
  programSemesterId: string;
};

export type EnrollmentListQuery = {
  page?: number;
  limit?: number;
  status?: string;
  semesterCourseId?: string;
};

export type EnrollmentListContext = {
  userId: string;
  role: Role;
  query: EnrollmentListQuery;
};
