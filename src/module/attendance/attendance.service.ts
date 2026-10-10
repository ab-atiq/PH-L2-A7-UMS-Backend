import httpStatus from "http-status";
import {
  AuditAction,
  EnrollmentStatus,
  Role,
} from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import type {
  AttendanceData,
  AttendanceUpdateData,
} from "./attendance.interface.js";

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

const audit = async (actorId: string, action: AuditAction, entityId: string) =>
  prisma.auditLog.create({
    data: { actorId, action, entity: "Attendance", entityId },
  });

const create = async (userId: string, data: AttendanceData) => {
  await ensureCourseAccess(data.semesterCourseId, userId);
  const enrollment = await prisma.courseEnrollment.findFirst({
    where: {
      id: data.courseEnrollmentId,
      semesterCourseId: data.semesterCourseId,
      status: EnrollmentStatus.ENROLLED,
      deletedAt: null,
    },
    select: { id: true, studentId: true },
  });
  if (!enrollment)
    throw new AppError(httpStatus.NOT_FOUND, "Active course enrollment not found");
  const item = await prisma.attendance.upsert({
    where: {
      studentId_semesterCourseId_classDate: {
        studentId: enrollment.studentId,
        semesterCourseId: data.semesterCourseId,
        classDate: data.classDate,
      },
    },
    create: {
      courseEnrollmentId: enrollment.id,
      studentId: enrollment.studentId,
      semesterCourseId: data.semesterCourseId,
      classDate: data.classDate,
      status: data.status,
      markedById: userId,
      ...(data.remarks !== undefined ? { remarks: data.remarks } : {}),
    },
    update: {
      status: data.status,
      markedById: userId,
      ...(data.remarks !== undefined ? { remarks: data.remarks } : {}),
    },
  });
  await audit(userId, AuditAction.MARK_ATTENDANCE, item.id);
  return item;
};

const update = async (
  userId: string,
  id: string,
  data: AttendanceUpdateData,
) => {
  const current = await prisma.attendance.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, semesterCourseId: true },
  });
  if (!current)
    throw new AppError(httpStatus.NOT_FOUND, "Attendance not found");
  await ensureCourseAccess(current.semesterCourseId, userId);
  const item = await prisma.attendance.update({
    where: { id },
    data: {
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.remarks !== undefined ? { remarks: data.remarks } : {}),
    },
  });
  await audit(userId, AuditAction.UPDATE_ATTENDANCE, item.id);
  return item;
};

const list = async (
  userId: string,
  role: Role,
  semesterCourseId?: string,
) => {
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
  if (student && !student.id)
    throw new AppError(httpStatus.NOT_FOUND, "Student profile not found");
  if (role === Role.STUDENT && !student)
    throw new AppError(httpStatus.NOT_FOUND, "Student profile not found");
  if (role === Role.FACULTY && !faculty)
    throw new AppError(httpStatus.NOT_FOUND, "Faculty profile not found");
  return prisma.attendance.findMany({
    where: {
      deletedAt: null,
      ...(semesterCourseId ? { semesterCourseId } : {}),
      ...(student ? { studentId: student.id } : {}),
      ...(faculty
        ? { semesterCourse: { teacherId: faculty.id } }
        : {}),
    },
    include: {
      semesterCourse: { include: { course: true, programSemester: true } },
      student: {
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      },
    },
    orderBy: { classDate: "desc" },
  });
};

export const AttendanceService = { create, update, list };
