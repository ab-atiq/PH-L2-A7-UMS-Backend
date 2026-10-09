import type { Gender } from "../../../generated/prisma/enums.js";

export type StudentCreateData = {
  userId: string;
  studentId: string;
  programId?: string | null;
  departmentId?: string | null;
  currentSemesterId?: string | null;
  batchYear?: number | null;
  gender?: Gender | null;
  dateOfBirth?: Date | null;
  address?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  admissionDate?: Date | null;
};

export type StudentUpdateData = Partial<Omit<StudentCreateData, "userId">> & {
  userId?: string;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
};

export type StudentListQuery = {
  page?: number | string;
  limit?: number | string;
  search?: string;
  departmentId?: string;
  programId?: string;
  currentSemesterId?: string;
  status?: string;
  includeDeleted?: boolean | string;
};

export type StudentSelfProfileData = Pick<
  StudentCreateData,
  "gender" | "dateOfBirth" | "address" | "guardianName" | "guardianPhone"
>;
