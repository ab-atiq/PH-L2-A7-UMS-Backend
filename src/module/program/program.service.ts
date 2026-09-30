import httpStatus from "http-status";
import { AuditAction, EntityStatus } from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import type {
  ProgramCreateData,
  ProgramListQuery,
  ProgramUpdateData,
} from "./program.interface.js";

const getSearchWhere = (query: ProgramListQuery) => ({
  deletedAt: null,
  ...(query.search
    ? {
        OR: [
          { name: { contains: query.search, mode: "insensitive" as const } },
          { code: { contains: query.search, mode: "insensitive" as const } },
        ],
      }
    : {}),
  ...(query.status ? { status: query.status as EntityStatus } : {}),
  ...(query.departmentId ? { departmentId: query.departmentId } : {}),
});

const programList = async (query: ProgramListQuery) => {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
  const where = getSearchWhere(query);
  const orderBy = {
    [query.sortBy || "createdAt"]: query.sortOrder || "desc",
  };

  // const [data, total] = await Promise.all([
  //   prisma.program.findMany({
  //     where,
  //     include: { department: true },
  //     skip: (page - 1) * limit,
  //     take: limit,
  //     orderBy,
  //   }),
  //   prisma.program.count({ where }),
  // ]);

  const [data, total] = await Promise.all([
    prisma.program.findMany({
      where,
      select: {
        id: true,
        name: true,
        code: true,
        departmentId: true,
        durationYears: true,
        totalCredits: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        department: true,
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy,
    }),
    prisma.program.count({ where }),
  ]);

  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const getSingleProgram = async (id: string) => {
  const item = await prisma.program.findFirst({
    where: { id, deletedAt: null },
    include: { department: true },
  });
  if (!item) {
    throw new AppError(httpStatus.NOT_FOUND, "Program not found");
  }
  return item;
};

// all programs with deleted and inactive programs for admin
const programListByAdmin = async (query: ProgramListQuery) => {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
  const where = {
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" as const } },
            { code: { contains: query.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(query.status ? { status: query.status as EntityStatus } : {}),
    ...(query.departmentId ? { departmentId: query.departmentId } : {}),
  };
  const orderBy = {
    [query.sortBy || "createdAt"]: query.sortOrder || "desc",
  };

  const [data, total] = await Promise.all([
    prisma.program.findMany({
      where,
      include: { department: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy,
    }),
    prisma.program.count({ where }),
  ]);

  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const getSingleProgramByAdmin = async (id: string) => {
  const item = await prisma.program.findUnique({
    where: { id },
    include: { department: true },
  });
  if (!item) {
    throw new AppError(httpStatus.NOT_FOUND, "Program not found");
  }
  return item;
};

const audit = async (
  actorId: string,
  action: AuditAction,
  entityId: string,
) => {
  await prisma.auditLog.create({
    data: { actorId, action, entity: "Program", entityId },
  });
};

const createNewProgram = async (data: ProgramCreateData, actorId: string) => {
  const department = await prisma.department.findFirst({
    where: {
      id: data.departmentId,
      deletedAt: null,
      status: EntityStatus.ACTIVE,
    },
  });
  if (!department) {
    throw new AppError(httpStatus.NOT_FOUND, "Active department not found");
  }
  const item = await prisma.program.create({ data });
  await audit(actorId, AuditAction.CREATE, item.id);
  return item;
};

const updateProgram = async (
  id: string,
  data: ProgramUpdateData,
  actorId: string,
) => {
  await getSingleProgram(id);
  if (data.departmentId) {
    const department = await prisma.department.findFirst({
      where: {
        id: data.departmentId,
        deletedAt: null,
        status: EntityStatus.ACTIVE,
      },
    });
    if (!department) {
      throw new AppError(httpStatus.NOT_FOUND, "Active department not found");
    }
  }
  const item = await prisma.program.update({ where: { id }, data });
  await audit(actorId, AuditAction.UPDATE, id);
  return item;
};

const removeProgram = async (id: string, actorId: string) => {
  await getSingleProgram(id);
  const item = await prisma.program.update({
    where: { id },
    data: { deletedAt: new Date(), status: EntityStatus.INACTIVE },
  });
  await audit(actorId, AuditAction.DELETE, id);
  return item;
};

export const ProgramService = {
  programList,
  getSingleProgram,
  programListByAdmin,
  getSingleProgramByAdmin,
  createNewProgram,
  updateProgram,
  removeProgram,
};
