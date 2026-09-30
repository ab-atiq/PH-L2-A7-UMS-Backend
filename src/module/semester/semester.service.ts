import httpStatus from "http-status";
import {
  AuditAction,
  SemesterStatus,
} from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import type {
  SemesterCreateData,
  SemesterListQuery,
  SemesterUpdateData,
} from "./semester.interface.js";

const getWhere = (query: SemesterListQuery, includeDeleted = false) => ({
  ...(includeDeleted ? {} : { deletedAt: null }),
  ...(query.search
    ? { name: { contains: query.search, mode: "insensitive" as const } }
    : {}),
  ...(query.status ? { status: query.status as SemesterStatus } : {}),
});

const listSemesters = async (
  query: SemesterListQuery,
  includeDeleted = false,
) => {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
  const where = getWhere(query, includeDeleted);
  const orderBy = {
    [query.sortBy || "createdAt"]: query.sortOrder || "desc",
  };
  const [data, total] = await Promise.all([
    prisma.semester.findMany({
      where,
      select: includeDeleted
        ? {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            registrationStart: true,
            registrationEnd: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            deletedAt: true,
          }
        : {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            registrationStart: true,
            registrationEnd: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
      skip: (page - 1) * limit,
      take: limit,
      orderBy,
    }),
    prisma.semester.count({ where }),
  ]);
  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const semesterList = (query: SemesterListQuery) => listSemesters(query);
const semesterListByAdmin = (query: SemesterListQuery) =>
  listSemesters(query, true);

const getSingleSemester = async (id: string) => {
  const item = await prisma.semester.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      registrationStart: true,
      registrationEnd: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      sections: {
        where: { deletedAt: null },
        select: {
          id: true,
          courseId: true,
          semesterId: true,
          sectionName: true,
          capacity: true,
          room: true,
          schedule: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          course: {
            select: {
              id: true,
              courseCode: true,
              title: true,
              credits: true,
              status: true,
            },
          },
        },
      },
    },
  });
  if (!item) {
    throw new AppError(httpStatus.NOT_FOUND, "Semester not found");
  }
  return item;
};

const getSingleSemesterByAdmin = async (id: string) => {
  const item = await prisma.semester.findUnique({
    where: { id },
    include: { sections: { include: { course: true } } },
  });

  if (!item) {
    throw new AppError(httpStatus.NOT_FOUND, "Semester not found");
  }
  return item;
};

const audit = async (
  actorId: string,
  action: AuditAction,
  entityId: string,
) => {
  await prisma.auditLog.create({
    data: { actorId, action, entity: "Semester", entityId },
  });
};

const createSemester = async (data: SemesterCreateData, actorId: string) => {
  const isExist = await prisma.semester.findFirst({
    where: {
      name: data.name,
      deletedAt: null,
    },
  });

  if (isExist) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Semester with this name already exists",
    );
  }

  const item = await prisma.semester.create({ data });
  await audit(actorId, AuditAction.CREATE, item.id);

  return item;
};

const updateSemester = async (
  id: string,
  data: SemesterUpdateData,
  actorId: string,
) => {
  const isExist = await getSingleSemesterByAdmin(id);
  if (!isExist) {
    throw new AppError(httpStatus.NOT_FOUND, "Semester not found");
  }

  const item = await prisma.semester.update({ where: { id }, data });
  await audit(actorId, AuditAction.UPDATE, id);

  return item;
};

const removeSemester = async (id: string, actorId: string) => {
  const isExist = await getSingleSemesterByAdmin(id);
  if (!isExist) {
    throw new AppError(httpStatus.NOT_FOUND, "Semester not found");
  }

  const item = await prisma.semester.update({
    where: { id },
    data: { deletedAt: new Date(), status: SemesterStatus.ARCHIVED },
  });

  await audit(actorId, AuditAction.DELETE, id);
  return item;
};

export const SemesterService = {
  semesterList,
  getSingleSemester,
  semesterListByAdmin,
  getSingleSemesterByAdmin,
  createSemester,
  updateSemester,
  removeSemester,
};
