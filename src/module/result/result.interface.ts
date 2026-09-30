import type { Role } from "../../../generated/prisma/enums.js";

export type ResultSubmitData = {
  examId: string;
  studentId: string;
  enrollmentId: string;
  marksObtained: number;
};

export type ResultListQuery = { examId?: string };
export type ResultListContext = {
  userId: string;
  role: Role;
  query: ResultListQuery;
};
