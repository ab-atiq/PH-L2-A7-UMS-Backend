import httpStatus from "http-status";
import {
  AuditAction,
  EntityStatus,
  Role,
} from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import type {
  FacultyCreateData,
  FacultyListFilter,
  FacultyListSearch,
  FacultyUpdateData,
} from "./faculty.interface.js";

const listFacultySearch = async (query: FacultyListSearch = {}) => {
  const search = query.search?.trim();
  const where = {
    deletedAt: null,
    ...(search
      ? {
          OR: [
            {
              employeeId: { contains: search, mode: "insensitive" as const },
            },
            {
              designation: { contains: search, mode: "insensitive" as const },
            },
            {
              specialization: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
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
          ],
        }
      : {}),
  };

  return prisma.facultyProfile.findMany({
    where,
    select: {
      id: true,
      employeeId: true,
      designation: true,
      specialization: true,
      joinDate: true,
      createdAt: true,
      updatedAt: true,
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
      department: {
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
        },
      },
    },
    orderBy: [{ employeeId: "asc" }],
  });
};

const listFacultyFilter = async (query: FacultyListFilter = {}) => {
  const contains = (value?: string) =>
    value?.trim()
      ? { contains: value.trim(), mode: "insensitive" as const }
      : undefined;

  const employeeId = contains(query.employeeId);
  const designation = contains(query.designation);
  const specialization = contains(query.specialization);
  const firstName = contains(query.firstName);
  const lastName = contains(query.lastName);
  const email = contains(query.email);
  const departmentName = contains(query.departmentName);
  const departmentCode = contains(query.departmentCode);

  const where = {
    deletedAt: null,
    ...(query.departmentId ? { departmentId: query.departmentId } : {}),
    ...(employeeId ? { employeeId } : {}),
    ...(designation ? { designation } : {}),
    ...(specialization ? { specialization } : {}),
    ...(departmentName || departmentCode
      ? {
          department: {
            ...(departmentName ? { name: departmentName } : {}),
            ...(departmentCode ? { code: departmentCode } : {}),
          },
        }
      : {}),
    ...(firstName || lastName || email
      ? {
          user: {
            ...(firstName ? { firstName } : {}),
            ...(lastName ? { lastName } : {}),
            ...(email ? { email } : {}),
          },
        }
      : {}),
  };

  return prisma.facultyProfile.findMany({
    where,
    select: {
      id: true,
      employeeId: true,
      designation: true,
      specialization: true,
      joinDate: true,
      createdAt: true,
      updatedAt: true,
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
      department: {
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
        },
      },
    },
    orderBy: [{ employeeId: "asc" }],
  });
};

const getFacultyById = async (employeeId: string) => {
  const faculty = await prisma.facultyProfile.findFirst({
    where: { employeeId, deletedAt: null },
    select: {
      id: true,
      employeeId: true,
      designation: true,
      specialization: true,
      joinDate: true,
      createdAt: true,
      updatedAt: true,
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

      department: {
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
        },
      },
    },
  });

  if (!faculty) {
    throw new AppError(httpStatus.NOT_FOUND, "Faculty profile not found");
  }
  return faculty;
};

const facultyMutationSelect = {
  id: true,
  employeeId: true,
  designation: true,
  specialization: true,
  departmentId: true,
  userId: true,
  joinDate: true,
  createdAt: true,
  updatedAt: true,
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
} as const;

const audit = async (
  actorId: string,
  action: AuditAction,
  entityId: string,
) => {
  await prisma.auditLog.create({
    data: { actorId, action, entity: "FacultyProfile", entityId },
  });
};

const ensureUser = async (userId: string) => {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true, role: true },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  } else if (user.role !== Role.FACULTY) {
    throw new AppError(httpStatus.BAD_REQUEST, "User is not a faculty");
  }
};

const ensureDepartment = async (departmentId?: string | null) => {
  if (!departmentId) return;
  const department = await prisma.department.findFirst({
    where: { id: departmentId, deletedAt: null, status: EntityStatus.ACTIVE },
    select: { id: true },
  });

  if (!department) {
    throw new AppError(httpStatus.NOT_FOUND, "Active department not found");
  }
};

const createFacultyProfile = async (
  data: FacultyCreateData,
  actorId: string,
) => {
  await ensureUser(data.userId);
  await ensureDepartment(data.departmentId);

  const [existingUserProfile, existingEmployee] = await Promise.all([
    prisma.facultyProfile.findUnique({
      where: { userId: data.userId },
      select: { id: true, deletedAt: true },
    }),
    prisma.facultyProfile.findUnique({
      where: { employeeId: data.employeeId },
      select: { id: true, deletedAt: true },
    }),
  ]);

  if (existingUserProfile) {
    throw new AppError(
      httpStatus.CONFLICT,
      existingUserProfile.deletedAt
        ? "A faculty profile already exists for this user and is deleted"
        : "A faculty profile already exists for this user",
    );
  }
  if (existingEmployee) {
    throw new AppError(
      httpStatus.CONFLICT,
      existingEmployee.deletedAt
        ? "This employee ID belongs to a deleted faculty profile"
        : "This employee ID is already in use",
    );
  }

  const faculty = await prisma.facultyProfile.create({
    data,
    select: facultyMutationSelect,
  });

  await audit(actorId, AuditAction.CREATE, faculty.id);
  return faculty;
};

const updateFacultyProfile = async (
  employeeId: string,
  data: FacultyUpdateData,
  actorId: string,
) => {
  const existing = await prisma.facultyProfile.findFirst({
    where: { employeeId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) {
    throw new AppError(httpStatus.NOT_FOUND, "Faculty profile not found");
  }

  if (data.userId) {
    await ensureUser(data.userId);
    const profileForUser = await prisma.facultyProfile.findUnique({
      where: { userId: data.userId },
      select: { id: true },
    });
    if (profileForUser && profileForUser.id !== existing.id) {
      throw new AppError(
        httpStatus.CONFLICT,
        "A faculty profile already exists for this user",
      );
    }
  }

  if (data.departmentId !== undefined) {
    await ensureDepartment(data.departmentId);
  }

  if (data.employeeId && data.employeeId !== employeeId) {
    const profileForEmployeeId = await prisma.facultyProfile.findUnique({
      where: { employeeId: data.employeeId },
      select: { id: true },
    });
    if (profileForEmployeeId && profileForEmployeeId.id !== existing.id) {
      throw new AppError(
        httpStatus.CONFLICT,
        "This employee ID is already in use",
      );
    }
  }

  const faculty = await prisma.facultyProfile.update({
    where: { employeeId },
    data,
    select: facultyMutationSelect,
  });

  await audit(actorId, AuditAction.UPDATE, faculty.id);
  return faculty;
};

const deleteFacultyProfile = async (employeeId: string, actorId: string) => {
  const existing = await prisma.facultyProfile.findFirst({
    where: { employeeId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) {
    throw new AppError(httpStatus.NOT_FOUND, "Faculty profile not found");
  }

  const faculty = await prisma.facultyProfile.update({
    where: { employeeId },
    data: { deletedAt: new Date() },
    select: facultyMutationSelect,
  });

  await audit(actorId, AuditAction.DELETE, faculty.id);
  return faculty;
};

export const FacultyService = {
  listFacultySearch,
  listFacultyFilter,
  getFacultyById,
  createFacultyProfile,
  updateFacultyProfile,
  deleteFacultyProfile,
};
