import httpStatus from "http-status";
import { AuditAction } from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import type { CoursePrerequisiteData } from "./course-prerequisite.interface.js";

const audit = async (
  actorId: string,
  action: AuditAction,
  entityId: string,
) => {
  await prisma.auditLog.create({
    data: { actorId, action, entity: "CoursePrerequisite", entityId },
  });
};

const addPrerequisite = async (
  data: CoursePrerequisiteData,
  actorId: string,
) => {
  if (data.courseId === data.prerequisiteId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "A course cannot be its own prerequisite",
    );
  }

  const courses = await prisma.course.findMany({
    where: {
      id: { in: [data.courseId, data.prerequisiteId] },
      deletedAt: null,
    },
    select: { id: true },
  });
  if (courses.length !== 2) {
    throw new AppError(httpStatus.NOT_FOUND, "Course not found");
  }

  const existing = await prisma.coursePrerequisite.findUnique({
    where: {
      courseId_prerequisiteId: {
        courseId: data.courseId,
        prerequisiteId: data.prerequisiteId,
      },
    },
  });
  if (existing) {
    throw new AppError(httpStatus.CONFLICT, "Prerequisite already exists");
  }

  const item = await prisma.coursePrerequisite.create({ data });
  await audit(actorId, AuditAction.CREATE, item.id);
  return item;
};

const getPrerequisites = async (courseId: string) => {
  const prerequisites = await prisma.coursePrerequisite.findMany({
    where: { courseId },
    include: { prerequisite: true },
  });
  return prerequisites.map((p) => p.prerequisite);
};

const removePrerequisite = async (
  courseId: string,
  prerequisiteId: string,
  actorId: string,
) => {
  const item = await prisma.coursePrerequisite.findUnique({
    where: { courseId_prerequisiteId: { courseId, prerequisiteId } },
  });
  if (!item) {
    throw new AppError(httpStatus.NOT_FOUND, "Prerequisite not found");
  }

  await prisma.coursePrerequisite.delete({ where: { id: item.id } });
  await audit(actorId, AuditAction.DELETE, item.id);
  return item;
};

export const CoursePrerequisiteService = {
  addPrerequisite,
  getPrerequisites,
  removePrerequisite,
};
