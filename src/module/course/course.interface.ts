import { CourseStatus } from "../../../generated/prisma/enums.js";

export type CourseListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  departmentId?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export type CourseCreateData = {
  courseCode: string;
  title: string;
  description?: string | null;
  credits: number;
  departmentId: string;
  status?: CourseStatus;
};

export type CourseUpdateData = {
  courseCode?: string;
  title?: string;
  description?: string | null;
  credits?: number;
  departmentId?: string;
  status?: CourseStatus;
};
