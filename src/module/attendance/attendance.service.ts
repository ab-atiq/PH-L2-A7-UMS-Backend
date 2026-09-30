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

const facultyForUser = async (userId: string) => {
  const faculty = await prisma.facultyProfile.findFirst({
    where: { userId, deletedAt: null },
    select: { id: true },
  });
  if (!faculty)
    throw new AppError(httpStatus.NOT_FOUND, "Faculty profile not found");
  return faculty;
};
const studentForUser = async (userId: string) => {
  const student = await prisma.studentProfile.findFirst({
    where: { userId, deletedAt: null },
    select: { id: true },
  });
  if (!student)
    throw new AppError(httpStatus.NOT_FOUND, "Student profile not found");
  return student;
};
const ensureFacultyAssignment = async (sectionId: string, userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (user?.role === Role.ADMIN) return;
  const faculty = await facultyForUser(userId);
  const assignment = await prisma.sectionFaculty.findUnique({
    where: { sectionId_facultyId: { sectionId, facultyId: faculty.id } },
    select: { id: true },
  });
  if (!assignment)
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Faculty is not assigned to this section",
    );
};
const audit = async (
  actorId: string,
  action: AuditAction,
  entityId: string,
) => {
  await prisma.auditLog.create({
    data: { actorId, action, entity: "Attendance", entityId },
  });
};
const create = async (userId: string, data: AttendanceData) => {
  await ensureFacultyAssignment(data.sectionId, userId);
  const updateData = {
    ...(data.status !== undefined ? { status: data.status } : {}),
    ...(data.remarks !== undefined ? { remarks: data.remarks } : {}),
  };
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      id: data.enrollmentId,
      sectionId: data.sectionId,
      status: EnrollmentStatus.ENROLLED,
    },
    select: { studentId: true },
  });
  if (!enrollment)
    throw new AppError(httpStatus.NOT_FOUND, "Active enrollment not found");
  const item = await prisma.attendance.create({
    data: { ...data, studentId: enrollment.studentId, markedById: userId },
  });
  await audit(userId, AuditAction.MARK_ATTENDANCE, item.id);
  return item;
};
const update = async (
  userId: string,
  id: string,
  data: AttendanceUpdateData,
) => {
  const current = await prisma.attendance.findUnique({
    where: { id },
    select: { sectionId: true },
  });
  if (!current)
    throw new AppError(httpStatus.NOT_FOUND, "Attendance not found");
  await ensureFacultyAssignment(current.sectionId, userId);
  const updateData = {
    ...(data.status !== undefined ? { status: data.status } : {}),
    ...(data.remarks !== undefined ? { remarks: data.remarks } : {}),
  };
  const item = await prisma.attendance.update({
    where: { id },
    data: updateData,
  });
  await audit(userId, AuditAction.UPDATE_ATTENDANCE, item.id);
  return item;
};
const list = async (userId: string, role: Role, sectionId: string) => {
  if (role === Role.FACULTY) await ensureFacultyAssignment(sectionId, userId);
  const where = {
    sectionId,
    deletedAt: null,
    ...(role === Role.STUDENT
      ? { studentId: (await studentForUser(userId)).id }
      : {}),
  };
  return prisma.attendance.findMany({ where, orderBy: { classDate: "desc" } });
};
export const AttendanceService = { create, update, list };
