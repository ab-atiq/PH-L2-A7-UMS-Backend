import httpStatus from "http-status";
import {
  AuditAction,
  EntityStatus,
  Role,
  UserStatus,
} from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import type {
  StudentSelfProfileData,
  StudentCreateData,
  StudentListQuery,
  StudentUpdateData,
} from "./student.interface.js";

const studentSelect = {
  id: true,
  studentId: true,
  userId: true,
  batchYear: true,
  gender: true,
  dateOfBirth: true,
  address: true,
  guardianName: true,
  guardianPhone: true,
  admissionDate: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      avatarUrl: true,
      status: true,
    },
  },
  department: { select: { id: true, name: true, code: true, status: true } },
  program: { select: { id: true, name: true, code: true, status: true } },
  currentSemester: { select: { id: true, name: true, status: true } },
} as const;

const audit = async (
  actorId: string,
  action: AuditAction,
  entityId: string,
) => {
  await prisma.auditLog.create({
    data: { actorId, action, entity: "StudentProfile", entityId },
  });
};

const ensureStudentUser = async (userId: string) => {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true, role: true },
  });
  if (!user || user.role !== Role.STUDENT)
    throw new AppError(httpStatus.NOT_FOUND, "Active student user not found");
};

const listStudentProfilesByAdmin = async (query: StudentListQuery) => {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
  const includeDeleted =
    query.includeDeleted === true || query.includeDeleted === "true";
  const search = query.search?.trim();
  const where = {
    ...(includeDeleted ? {} : { deletedAt: null }),
    ...(query.departmentId ? { departmentId: query.departmentId } : {}),
    ...(query.programId ? { programId: query.programId } : {}),
    ...(query.currentSemesterId
      ? { currentSemesterId: query.currentSemesterId }
      : {}),
    ...(query.status ? { user: { status: query.status as UserStatus } } : {}),
    ...(search
      ? {
          OR: [
            { studentId: { contains: search, mode: "insensitive" as const } },
            {
              user: {
                OR: [
                  {
                    firstName: {
                      contains: search,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    lastName: {
                      contains: search,
                      mode: "insensitive" as const,
                    },
                  },
                  { email: { contains: search, mode: "insensitive" as const } },
                ],
              },
            },
            {
              department: {
                OR: [
                  {
                    name: {
                      contains: search,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    code: {
                      contains: search,
                      mode: "insensitive" as const,
                    },
                  },
                ],
              },
            },
            {
              program: {
                OR: [
                  {
                    name: {
                      contains: search,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    code: {
                      contains: search,
                      mode: "insensitive" as const,
                    },
                  },
                ],
              },
            },
          ],
        }
      : {}),
  };
  const [data, total] = await Promise.all([
    prisma.studentProfile.findMany({
      where,
      select: studentSelect,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ studentId: "asc" }],
    }),
    prisma.studentProfile.count({ where }),
  ]);
  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const ensureRelations = async (
  data: Pick<
    StudentCreateData,
    "programId" | "departmentId" | "currentSemesterId"
  >,
) => {
  if (data.departmentId) {
    const department = await prisma.department.findFirst({
      where: {
        id: data.departmentId,
        deletedAt: null,
        status: EntityStatus.ACTIVE,
      },
      select: { id: true },
    });
    if (!department)
      throw new AppError(httpStatus.NOT_FOUND, "Active department not found");
  }
  if (data.programId) {
    const program = await prisma.program.findFirst({
      where: {
        id: data.programId,
        deletedAt: null,
        status: EntityStatus.ACTIVE,
      },
      select: { id: true, departmentId: true },
    });
    if (!program)
      throw new AppError(httpStatus.NOT_FOUND, "Active program not found");
    if (data.departmentId && program.departmentId !== data.departmentId)
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Program does not belong to the selected department",
      );
  }
  if (data.currentSemesterId) {
    const semester = await prisma.semester.findFirst({
      where: { id: data.currentSemesterId, deletedAt: null },
      select: { id: true },
    });
    if (!semester)
      throw new AppError(httpStatus.NOT_FOUND, "Active semester not found");
  }
};

const createStudentProfile = async (
  data: StudentCreateData,
  actorId: string,
) => {
  await ensureStudentUser(data.userId);
  await ensureRelations(data);

  const [existingUser, existingStudentId] = await Promise.all([
    prisma.studentProfile.findUnique({
      where: { userId: data.userId },
      select: { id: true },
    }),
    prisma.studentProfile.findUnique({
      where: { studentId: data.studentId },
      select: { id: true },
    }),
  ]);

  if (existingUser) {
    throw new AppError(
      httpStatus.CONFLICT,
      "A student profile already exists for this user",
    );
  }

  if (existingStudentId) {
    throw new AppError(
      httpStatus.CONFLICT,
      "This student ID is already in use",
    );
  }

  const profile = await prisma.studentProfile.create({
    data,
    select: studentSelect,
  });

  await audit(actorId, AuditAction.CREATE, profile.id);
  return profile;
};

const getStudentProfile = async (studentId: string, includeDeleted = false) => {
  const profile = await prisma.studentProfile.findFirst({
    where: { studentId, ...(includeDeleted ? {} : { deletedAt: null }) },
    select: studentSelect,
  });

  if (!profile) {
    throw new AppError(httpStatus.NOT_FOUND, "Student profile not found");
  }
  return profile;
};

const getMyStudentProfile = async (userId: string) => {
  const profile = await prisma.studentProfile.findFirst({
    where: { userId, deletedAt: null },
    select: studentSelect,
  });

  if (!profile) {
    throw new AppError(httpStatus.NOT_FOUND, "Student profile not found");
  }
  return profile;
};

const createMyStudentProfile = async (
  data: StudentSelfProfileData,
  userId: string,
) => {
  await ensureStudentUser(userId);

  const existing = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { id: true, studentId: true, deletedAt: true },
  });
  if (existing && !existing.deletedAt) {
    throw new AppError(
      httpStatus.CONFLICT,
      "A student profile already exists for this account",
    );
  }

  const profile = existing
    ? await prisma.studentProfile.update({
        where: { userId },
        data: { ...data, deletedAt: null },
        select: studentSelect,
      })
    : await prisma.studentProfile.create({
        data: { ...data, userId, studentId: `STU-${userId}` },
        select: studentSelect,
      });

  await audit(
    userId,
    existing ? AuditAction.UPDATE : AuditAction.CREATE,
    profile.id,
  );
  return profile;
};

const updateMyStudentProfile = async (
  data: StudentSelfProfileData,
  userId: string,
) => {
  const existing = await prisma.studentProfile.findFirst({
    where: { userId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) {
    throw new AppError(httpStatus.NOT_FOUND, "Student profile not found");
  }

  const profile = await prisma.studentProfile.update({
    where: { userId },
    data,
    select: studentSelect,
  });
  await audit(userId, AuditAction.UPDATE, profile.id);
  return profile;
};

const deleteMyStudentProfile = async (userId: string) => {
  const existing = await prisma.studentProfile.findFirst({
    where: { userId, deletedAt: null },
    select: { id: true, studentId: true },
  });
  if (!existing) {
    throw new AppError(httpStatus.NOT_FOUND, "Student profile not found");
  }

  const profile = await prisma.studentProfile.update({
    where: { userId },
    data: { deletedAt: new Date() },
    select: studentSelect,
  });
  await audit(userId, AuditAction.DELETE, profile.id);
  return profile;
};

const updateStudentProfile = async (
  studentId: string,
  data: StudentUpdateData,
  actorId: string,
) => {
  const existing = await prisma.studentProfile.findFirst({
    where: { studentId, deletedAt: null },
    select: {
      id: true,
      userId: true,
      departmentId: true,
      programId: true,
      currentSemesterId: true,
    },
  });
  if (!existing) {
    throw new AppError(httpStatus.NOT_FOUND, "Student profile not found");
  }
  if (data.userId) {
    await ensureStudentUser(data.userId);
  }
  await ensureRelations({
    departmentId: data.departmentId ?? existing.departmentId,
    programId: data.programId ?? existing.programId,
    currentSemesterId: data.currentSemesterId ?? existing.currentSemesterId,
  });

  if (data.userId && data.userId !== existing.userId) {
    const duplicate = await prisma.studentProfile.findUnique({
      where: { userId: data.userId },
      select: { id: true },
    });

    if (duplicate && duplicate.id !== existing.id)
      throw new AppError(
        httpStatus.CONFLICT,
        "A student profile already exists for this user",
      );
  }
  if (data.studentId && data.studentId !== studentId) {
    const duplicate = await prisma.studentProfile.findUnique({
      where: { studentId: data.studentId },
      select: { id: true },
    });

    if (duplicate && duplicate.id !== existing.id) {
      throw new AppError(
        httpStatus.CONFLICT,
        "This student ID is already in use",
      );
    }
  }

  const { firstName, lastName, phone, ...profileData } = data;
  const targetUserId = data.userId ?? existing.userId;
  const profile = await prisma.$transaction(async (transaction) => {
    if (
      firstName !== undefined ||
      lastName !== undefined ||
      phone !== undefined
    ) {
      await transaction.user.update({
        where: { id: targetUserId },
        data: {
          ...(firstName === undefined ? {} : { firstName }),
          ...(lastName === undefined ? {} : { lastName }),
          ...(phone === undefined ? {} : { phone }),
        },
      });
    }
    return transaction.studentProfile.update({
      where: { studentId },
      data: profileData,
      select: studentSelect,
    });
  });

  await audit(actorId, AuditAction.UPDATE, profile.id);
  return profile;
};

const deleteStudentProfile = async (studentId: string, actorId: string) => {
  const existing = await prisma.studentProfile.findFirst({
    where: { studentId, deletedAt: null },
    select: { id: true },
  });

  if (!existing) {
    throw new AppError(httpStatus.NOT_FOUND, "Student profile not found");
  }

  const profile = await prisma.studentProfile.update({
    where: { studentId },
    data: { deletedAt: new Date() },
    select: studentSelect,
  });

  await audit(actorId, AuditAction.DELETE, profile.id);
  return profile;
};

export const StudentService = {
  listStudentProfilesByAdmin,
  createStudentProfile,
  getStudentProfile,
  updateStudentProfile,
  deleteStudentProfile,
  getMyStudentProfile,
  createMyStudentProfile,
  updateMyStudentProfile,
  deleteMyStudentProfile,
};
