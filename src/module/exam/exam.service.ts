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

const profile = async (userId: string, role: Role) => {
  if (role === Role.STUDENT) {
    const student = await prisma.studentProfile.findFirst({
      where: { userId, deletedAt: null },
      select: { id: true },
    });
    if (!student)
      throw new AppError(httpStatus.NOT_FOUND, "Student profile not found");
    return { student };
  }
  if (role === Role.FACULTY) {
    const faculty = await prisma.facultyProfile.findFirst({
      where: { userId, deletedAt: null },
      select: { id: true },
    });
    if (!faculty)
      throw new AppError(httpStatus.NOT_FOUND, "Faculty profile not found");
    return { faculty };
  }
  return {};
};
const ensureFacultyAssignment = async (sectionId: string, userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (user?.role === Role.ADMIN) return;
  const faculty = await prisma.facultyProfile.findFirst({
    where: { userId, deletedAt: null },
    select: { id: true },
  });
  if (!faculty)
    throw new AppError(httpStatus.NOT_FOUND, "Faculty profile not found");
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
    data: { actorId, action, entity: "Exam", entityId },
  });
};
const create = async (userId: string, data: ExamData) => {
  await ensureFacultyAssignment(data.sectionId, userId);
  const section = await prisma.section.findFirst({
    where: { id: data.sectionId, deletedAt: null },
    select: { id: true },
  });
  if (!section) throw new AppError(httpStatus.NOT_FOUND, "Section not found");
  const item = await prisma.exam.create({ data });
  await audit(userId, AuditAction.CREATE_EXAM, item.id);
  return item;
};
const update = async (userId: string, id: string, data: ExamUpdateData) => {
  const exam = await prisma.exam.findUnique({
    where: { id },
    select: { sectionId: true },
  });
  if (!exam) throw new AppError(httpStatus.NOT_FOUND, "Exam not found");
  await ensureFacultyAssignment(exam.sectionId, userId);
  const item = await prisma.exam.update({ where: { id }, data });
  await audit(userId, AuditAction.UPDATE_EXAM, item.id);
  return item;
};
const publish = async (userId: string, id: string) => {
  const exam = await prisma.exam.findUnique({
    where: { id },
    select: { sectionId: true },
  });
  if (!exam) throw new AppError(httpStatus.NOT_FOUND, "Exam not found");
  await ensureFacultyAssignment(exam.sectionId, userId);
  const item = await prisma.exam.update({
    where: { id },
    data: { status: ExamStatus.PUBLISHED },
  });
  await audit(userId, AuditAction.UPDATE_EXAM, item.id);
  return item;
};
const list = async (userId: string, role: Role, query: ExamListQuery) => {
  const { student, faculty } = await profile(userId, role);
  const where: any = {
    deletedAt: null,
    ...(query.sectionId ? { sectionId: query.sectionId } : {}),
  };
  if (faculty)
    where.section = { facultyAssignments: { some: { facultyId: faculty.id } } };
  if (student)
    where.section = {
      enrollments: {
        some: { studentId: student.id, status: EnrollmentStatus.ENROLLED },
      },
    };
  return prisma.exam.findMany({
    where,
    include: { section: { include: { course: true, semester: true } } },
    orderBy: { examDate: "asc" },
  });
};
export const ExamService = { create, update, publish, list };
