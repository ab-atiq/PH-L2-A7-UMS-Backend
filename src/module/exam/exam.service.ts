import httpStatus from "http-status";
import {
  AuditAction,
  EnrollmentStatus,
  ExamStatus,
  Role,
} from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import type {
  ExamData,
  ExamListQuery,
  ExamUpdateData,
} from "./exam.interface.js";

const ensureCourseAccess = async (semesterCourseId: string, userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (user?.role === Role.ADMIN) return;
  const faculty = await prisma.facultyProfile.findFirst({
    where: {
      userId,
      deletedAt: null,
      semesterCourses: { some: { id: semesterCourseId, deletedAt: null } },
    },
    select: { id: true },
  });
  if (!faculty)
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not assigned to this course",
    );
};

const audit = async (actorId: string, entityId: string) =>
  prisma.auditLog.create({
    data: {
      actorId,
      action: AuditAction.CREATE_EXAM,
      entity: "Exam",
      entityId,
    },
  });

const create = async (userId: string, data: ExamData) => {
  await ensureCourseAccess(data.semesterCourseId, userId);
  const semesterCourse = await prisma.semesterCourse.findFirst({
    where: { id: data.semesterCourseId, deletedAt: null },
    select: { id: true },
  });
  if (!semesterCourse)
    throw new AppError(httpStatus.NOT_FOUND, "Semester course not found");
  const item = await prisma.exam.create({ data });
  await audit(userId, item.id);
  return item;
};

const update = async (userId: string, id: string, data: ExamUpdateData) => {
  const exam = await prisma.exam.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, semesterCourseId: true },
  });
  if (!exam) throw new AppError(httpStatus.NOT_FOUND, "Exam not found");
  const semesterCourseId = data.semesterCourseId ?? exam.semesterCourseId;
  await ensureCourseAccess(semesterCourseId, userId);
  const item = await prisma.exam.update({ where: { id }, data });
  await audit(userId, item.id);
  return item;
};

const publish = async (userId: string, id: string) => {
  const exam = await prisma.exam.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, semesterCourseId: true },
  });
  if (!exam) throw new AppError(httpStatus.NOT_FOUND, "Exam not found");
  await ensureCourseAccess(exam.semesterCourseId, userId);
  const item = await prisma.exam.update({
    where: { id },
    data: { status: ExamStatus.PUBLISHED },
  });
  await audit(userId, item.id);
  return item;
};

const list = async (userId: string, role: Role, query: ExamListQuery) => {
  const student =
    role === Role.STUDENT
      ? await prisma.studentProfile.findFirst({
          where: { userId, deletedAt: null },
          select: { id: true },
        })
      : null;
  const faculty =
    role === Role.FACULTY
      ? await prisma.facultyProfile.findFirst({
          where: { userId, deletedAt: null },
          select: { id: true },
        })
      : null;
  if (role === Role.STUDENT && !student)
    throw new AppError(httpStatus.NOT_FOUND, "Student profile not found");
  if (role === Role.FACULTY && !faculty)
    throw new AppError(httpStatus.NOT_FOUND, "Faculty profile not found");
  return prisma.exam.findMany({
    where: {
      deletedAt: null,
      ...(query.semesterCourseId
        ? { semesterCourseId: query.semesterCourseId }
        : {}),
      ...(student
        ? {
            status: ExamStatus.PUBLISHED,
            semesterCourse: {
              courseEnrollments: {
                some: {
                  studentId: student.id,
                  status: EnrollmentStatus.ENROLLED,
                },
              },
            },
          }
        : {}),
      ...(faculty
        ? { semesterCourse: { teacherId: faculty.id } }
        : {}),
    },
    include: {
      semesterCourse: {
        include: {
          course: true,
          programSemester: { include: { program: true } },
        },
      },
    },
    orderBy: { examDate: "asc" },
  });
};

export const ExamService = { create, update, publish, list };
