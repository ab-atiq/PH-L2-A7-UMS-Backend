import httpStatus from "http-status";
import {
  AuditAction,
  EnrollmentStatus,
  SectionStatus,
} from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import type {
  SectionCreateData,
  SectionListQuery,
  SectionUpdateData,
} from "./section.interface.js";

const publicUser = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
} as const;

const sectionSelect = {
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
  semester: {
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      status: true,
    },
  },
  facultyAssignments: {
    select: {
      id: true,
      sectionId: true,
      facultyId: true,
      isPrimary: true,
      createdAt: true,
      faculty: {
        select: {
          id: true,
          employeeId: true,
          designation: true,
          user: { select: publicUser },
        },
      },
    },
  },
} as const;

const getWhere = (query: SectionListQuery, includeDeleted = false) => ({
  ...(includeDeleted ? {} : { deletedAt: null }),
  ...(query.search
    ? { sectionName: { contains: query.search, mode: "insensitive" as const } }
    : {}),
  ...(query.status ? { status: query.status as SectionStatus } : {}),
  ...(query.courseId ? { courseId: query.courseId } : {}),
  ...(query.semesterId ? { semesterId: query.semesterId } : {}),
});

const listSections = async (
  query: SectionListQuery,
  includeDeleted = false,
) => {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
  const where = getWhere(query, includeDeleted);
  const orderBy = { [query.sortBy || "createdAt"]: query.sortOrder || "desc" };

  const [data, total] = await Promise.all([
    prisma.section.findMany({
      where,
      select: includeDeleted
        ? { ...sectionSelect, deletedAt: true }
        : sectionSelect,
      skip: (page - 1) * limit,
      take: limit,
      orderBy,
    }),
    prisma.section.count({ where }),
  ]);

  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const sectionList = (query: SectionListQuery) => listSections(query);

const sectionListByAdmin = (query: SectionListQuery) =>
  listSections(query, true);

const getSingleSection = async (id: string) => {
  const item = await prisma.section.findFirst({
    where: { id, deletedAt: null },
    select: {
      ...sectionSelect,
      enrollments: {
        where: { status: EnrollmentStatus.ENROLLED },
        select: {
          id: true,
          studentId: true,
          status: true,
          student: {
            select: { id: true, studentId: true, user: { select: publicUser } },
          },
        },
      },
    },
  });
  if (!item) {
    throw new AppError(httpStatus.NOT_FOUND, "Section not found");
  }
  return item;
};

const getSingleSectionByAdmin = async (id: string) => {
  const item = await prisma.section.findUnique({
    where: { id },
    include: {
      course: true,
      semester: true,
      facultyAssignments: {
        include: { faculty: { include: { user: { select: publicUser } } } },
      },
    },
  });
  if (!item) {
    throw new AppError(httpStatus.NOT_FOUND, "Section not found");
  }
  return item;
};

const audit = async (
  actorId: string,
  action: AuditAction,
  entityId: string,
) => {
  await prisma.auditLog.create({
    data: { actorId, action, entity: "Section", entityId },
  });
};

const ensureRelations = async (courseId: string, semesterId: string) => {
  const [course, semester] = await Promise.all([
    prisma.course.findFirst({ where: { id: courseId, deletedAt: null } }),
    prisma.semester.findFirst({ where: { id: semesterId, deletedAt: null } }),
  ]);

  if (!course || !semester)
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Active course or semester not found",
    );
};

const createSection = async (data: SectionCreateData, actorId: string) => {
  await ensureRelations(data.courseId, data.semesterId);
  const item = await prisma.section.create({ data });
  await audit(actorId, AuditAction.CREATE, item.id);
  return item;
};

const updateSection = async (
  id: string,
  data: SectionUpdateData,
  actorId: string,
) => {
  await getSingleSection(id);
  if (data.courseId || data.semesterId) {
    const current = await prisma.section.findUnique({
      where: { id },
      select: { courseId: true, semesterId: true },
    });
    await ensureRelations(
      data.courseId || current!.courseId,
      data.semesterId || current!.semesterId,
    );
  }

  const item = await prisma.section.update({ where: { id }, data });
  await audit(actorId, AuditAction.UPDATE, id);
  return item;
};

const removeSection = async (id: string, actorId: string) => {
  await getSingleSection(id);
  const item = await prisma.section.update({
    where: { id },
    data: { deletedAt: new Date(), status: SectionStatus.CANCELLED },
  });

  await audit(actorId, AuditAction.DELETE, id);
  return item;
};

export const SectionService = {
  sectionList,
  sectionListByAdmin,
  getSingleSection,
  getSingleSectionByAdmin,
  createSection,
  updateSection,
  removeSection,
};
