import type {
  AttendanceStatus,
  Role,
} from "../../../generated/prisma/enums.js";

export type AttendanceData = {
  enrollmentId: string;
  sectionId: string;
  classDate: Date;
  status: AttendanceStatus;
  remarks?: string | null;
};

export type AttendanceUpdateData = {
  status?: AttendanceStatus;
  remarks?: string | null;
};

export type AttendanceListContext = {
  userId: string;
  role: Role;
  sectionId: string;
};
