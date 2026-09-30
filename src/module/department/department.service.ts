import httpStatus from "http-status";
import { AuditAction, EntityStatus } from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import type {
  DepartmentCreateData,
  DepartmentListQuery,
  DepartmentUpdateData,
} from "./department.interface.js";

const getSearchWhere = (query: DepartmentListQuery) => ({
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
});

// Ensure only non-deleted records are fetched
const departmentList = async (query: DepartmentListQuery) => {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
  const where = getSearchWhere(query);
  const orderBy = {
    [query.sortBy || "createdAt"]: query.sortOrder || "desc",
  };

  // const [data, total] = await Promise.all([
  //   prisma.department.findMany({
  //     where,
  //     skip: (page - 1) * limit,
  //     take: limit,
  //     orderBy,
  //   }),
  //   prisma.department.count({ where }),
  // ]);

  const [data, total] = await Promise.all([
    prisma.department.findMany({
      where,
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy,
    }),
    prisma.department.count({ where }),
  ]);

  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const getSingleDepartment = async (id: string) => {
  const item = await prisma.department.findFirst({
    where: { id, deletedAt: null },
    include: {
      programs: { where: { deletedAt: null } },
      courses: { where: { deletedAt: null } },
    },
  });
  if (!item) {
    throw new AppError(httpStatus.NOT_FOUND, "Department not found");
  }
  return item;
};

// Admin-specific methods
const departmentListByAdmin = async (query: DepartmentListQuery) => {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
  // Admin can see all records, including those marked as deleted
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
  };

  const orderBy = {
    [query.sortBy || "createdAt"]: query.sortOrder || "desc",
  };

  const [data, total] = await Promise.all([
    prisma.department.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy,
    }),
    prisma.department.count({ where }),
  ]);

  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const getSingleDepartmentByAdmin = async (id: string) => {
  const item = await prisma.department.findUnique({
    where: { id },
    include: {
      programs: true,
      courses: true,
    },
  });

  if (!item) {
    throw new AppError(httpStatus.NOT_FOUND, "Department not found");
  }
  return item;
};

// reuseable audit function for department actions
const audit = async (
  actorId: string,
  action: AuditAction,
  entityId: string,
) => {
  await prisma.auditLog.create({
    data: { actorId, action, entity: "Department", entityId },
  });
};

const createNewDepartment = async (
  data: DepartmentCreateData,
  actorId: string,
) => {
  const item = await prisma.department.create({ data });
  await audit(actorId, AuditAction.CREATE, item.id);
  return item;
};

const updateDepartment = async (
  id: string,
  data: DepartmentUpdateData,
  actorId: string,
) => {
  await getSingleDepartment(id);
  const item = await prisma.department.update({ where: { id }, data });
  await audit(actorId, AuditAction.UPDATE, id);
  return item;
};

const removeDepartment = async (id: string, actorId: string) => {
  await getSingleDepartment(id);
  const item = await prisma.department.update({
    where: { id },
    data: { deletedAt: new Date(), status: EntityStatus.INACTIVE },
  });
  await audit(actorId, AuditAction.DELETE, id);
  return item;
};

export const DepartmentService = {
  departmentList,
  getSingleDepartment,
  departmentListByAdmin,
  getSingleDepartmentByAdmin,
  createNewDepartment,
  updateDepartment,
  removeDepartment,
};
