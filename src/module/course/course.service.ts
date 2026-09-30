import httpStatus from "http-status";
import {
  AuditAction,
  CourseStatus,
  EntityStatus,
} from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import type {
  CourseCreateData,
  CourseListQuery,
  CourseUpdateData,
} from "./course.interface.js";

const courseSelect = {
  id: true,
  courseCode: true,
  title: true,
  description: true,
  credits: true,
  departmentId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  department: true,
  prerequisitesFor: { include: { prerequisite: true } },
} as const;

const getSearchWhere = (query: CourseListQuery, includeDeleted = false) => ({
  ...(includeDeleted ? {} : { deletedAt: null }),
  ...(query.search
    ? {
        OR: [
          {
            courseCode: {
              contains: query.search,
              mode: "insensitive" as const,
            },
          },
          { title: { contains: query.search, mode: "insensitive" as const } },
        ],
      }
    : {}),
  ...(query.status ? { status: query.status as CourseStatus } : {}),
  ...(query.departmentId ? { departmentId: query.departmentId } : {}),
});

const courseList = async (query: CourseListQuery) => {
  return listCourses(query, false);
};

const listCourses = async (query: CourseListQuery, includeDeleted: boolean) => {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
  const where = getSearchWhere(query, includeDeleted);
  const orderBy = {
    [query.sortBy || "createdAt"]: query.sortOrder || "desc",
  };

  const [data, total] = await Promise.all([
    prisma.course.findMany({
      where,
      select: courseSelect,
      skip: (page - 1) * limit,
      take: limit,
      orderBy,
    }),
    prisma.course.count({ where }),
  ]);

  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const getSingleCourse = async (id: string) => {
  const item = await prisma.course.findFirst({
    where: { id, deletedAt: null },
    select: {
      ...courseSelect,
      sections: { where: { deletedAt: null }, include: { semester: true } },
    },
  });

  if (!item) {
    throw new AppError(httpStatus.NOT_FOUND, "Course not found");
  }

  return item;
};

const courseListByAdmin = async (query: CourseListQuery) =>
  listCourses(query, true);

const getSingleCourseByAdmin = async (id: string) => {
  const item = await prisma.course.findUnique({
    where: { id },
    select: {
      ...courseSelect,
      sections: { include: { semester: true } },
    },
  });

  if (!item) {
    throw new AppError(httpStatus.NOT_FOUND, "Course not found");
  }

  return item;
};

const audit = async (
  actorId: string,
  action: AuditAction,
  entityId: string,
) => {
  await prisma.auditLog.create({
    data: { actorId, action, entity: "Course", entityId },
  });
};

const ensureActiveDepartment = async (departmentId: string) => {
  const department = await prisma.department.findFirst({
    where: {
      id: departmentId,
      deletedAt: null,
      status: EntityStatus.ACTIVE,
    },
  });

  if (!department) {
    throw new AppError(httpStatus.NOT_FOUND, "Active department not found");
  }
};

const createNewCourse = async (data: CourseCreateData, actorId: string) => {
  await ensureActiveDepartment(data.departmentId);
  const item = await prisma.course.create({ data });
  await audit(actorId, AuditAction.CREATE, item.id);
  return item;
};

const updateCourse = async (
  id: string,
  data: CourseUpdateData,
  actorId: string,
) => {
  await getSingleCourse(id);
  if (data.departmentId) {
    await ensureActiveDepartment(data.departmentId);
  }
  const item = await prisma.course.update({ where: { id }, data });
  await audit(actorId, AuditAction.UPDATE, id);
  return item;
};

const removeCourse = async (id: string, actorId: string) => {
  await getSingleCourse(id);
  const item = await prisma.course.update({
    where: { id },
    data: { deletedAt: new Date(), status: CourseStatus.ARCHIVED },
  });
  await audit(actorId, AuditAction.DELETE, id);
  return item;
};

export const CourseService = {
  courseList,
  getSingleCourse,
  courseListByAdmin,
  getSingleCourseByAdmin,
  createNewCourse,
  updateCourse,
  removeCourse,
};
