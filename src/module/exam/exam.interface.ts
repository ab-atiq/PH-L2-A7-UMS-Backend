import type {
  ExamStatus,
  ExamType,
  Role,
} from "../../../generated/prisma/enums.js";

export type ExamData = {
  semesterCourseId: string;
  examType: ExamType;
  title?: string | null;
  examDate: Date;
  totalMarks: number;
  weightage?: number | null;
  status?: ExamStatus;
};

export type ExamUpdateData = Partial<ExamData>;
export type ExamListQuery = { semesterCourseId?: string };
export type ExamListContext = {
  userId: string;
  role: Role;
  query: ExamListQuery;
};
