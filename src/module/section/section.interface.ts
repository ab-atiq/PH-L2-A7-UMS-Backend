import type { Prisma } from "../../../generated/prisma/client.js";
import { SectionStatus } from "../../../generated/prisma/enums.js";

export type SectionListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  courseId?: string;
  semesterId?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export type SectionCreateData = {
  courseId: string;
  semesterId: string;
  sectionName: string;
  capacity: number;
  room?: string | null;
  schedule?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
  status?: SectionStatus;
};

export type SectionUpdateData = {
  courseId?: string;
  semesterId?: string;
  sectionName?: string;
  capacity?: number;
  room?: string | null;
  schedule?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
  status?: SectionStatus;
};
