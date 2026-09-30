import httpStatus from "http-status";
import {
  AuditAction,
  EnrollmentStatus,
  Grade,
  ResultStatus,
  Role,
} from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import type { ResultListQuery, ResultSubmitData } from "./result.interface.js";

const gradeFor = (percentage: number) =>
  percentage >= 90
    ? { grade: Grade.A_PLUS, gradePoint: 4 }
    : percentage >= 85
      ? { grade: Grade.A, gradePoint: 3.75 }
      : percentage >= 80
        ? { grade: Grade.A_MINUS, gradePoint: 3.5 }
        : percentage >= 75
          ? { grade: Grade.B_PLUS, gradePoint: 3.25 }
          : percentage >= 70
            ? { grade: Grade.B, gradePoint: 3 }
            : percentage >= 65
              ? { grade: Grade.B_MINUS, gradePoint: 2.75 }
              : percentage >= 60
                ? { grade: Grade.C_PLUS, gradePoint: 2.5 }
                : percentage >= 55
                  ? { grade: Grade.C, gradePoint: 2.25 }
                  : percentage >= 50
                    ? { grade: Grade.C_MINUS, gradePoint: 2 }
                    : percentage >= 45
                      ? { grade: Grade.D, gradePoint: 1 }
                      : { grade: Grade.F, gradePoint: 0 };
const ensureFacultyAssignment = async (sectionId: string, userId: string) => {
  const faculty = await prisma.facultyProfile.findFirst({
    where: { userId, deletedAt: null },
    select: { id: true },
  });
  if (!faculty)
    throw new AppError(httpStatus.NOT_FOUND, "Faculty profile not found");
  // const assignment = await prisma.sectionFaculty.findUnique({
  //   where: { sectionId_facultyId: { sectionId, facultyId: faculty.id } },
  //   select: { id: true },
  // });
  // if (!assignment)
  //   throw new AppError(
  //     httpStatus.FORBIDDEN,
  //     "Faculty is not assigned to this section",
  //   );
};
const getStudent = async (userId: string) => {
  const student = await prisma.studentProfile.findFirst({
    where: { userId, deletedAt: null },
    select: { id: true },
  });
  if (!student)
    throw new AppError(httpStatus.NOT_FOUND, "Student profile not found");
  return student;
};
const audit = async (actorId: string, action: AuditAction, entityId: string) =>
  prisma.auditLog.create({
    data: { actorId, action, entity: "Result", entityId },
  });
const submit = async (userId: string, data: ResultSubmitData) => {
  const exam = await prisma.exam.findUnique({
    where: { id: data.examId },
    select: { id: true, sectionId: true, totalMarks: true },
  });
  if (!exam) throw new AppError(httpStatus.NOT_FOUND, "Exam not found");
  await ensureFacultyAssignment(exam.sectionId, userId);
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      id: data.enrollmentId,
      studentId: data.studentId,
      sectionId: exam.sectionId,
      status: EnrollmentStatus.ENROLLED,
    },
    select: { id: true },
  });
  if (!enrollment)
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Matching active enrollment not found",
    );
  if (data.marksObtained > exam.totalMarks)
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Marks cannot exceed total marks",
    );
  const item = await prisma.result.upsert({
    where: {
      examId_studentId: { examId: data.examId, studentId: data.studentId },
    },
    update: {
      enrollmentId: data.enrollmentId,
      marksObtained: data.marksObtained,
      ...gradeFor((data.marksObtained / exam.totalMarks) * 100),
      enteredById: userId,
      status: ResultStatus.SUBMITTED,
    },
    create: {
      ...data,
      ...gradeFor((data.marksObtained / exam.totalMarks) * 100),
      enteredById: userId,
      status: ResultStatus.SUBMITTED,
    },
  });
  await audit(userId, AuditAction.CREATE_RESULT, item.id);
  return item;
};
const publish = async (userId: string, id: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (user?.role !== Role.ADMIN)
    throw new AppError(httpStatus.FORBIDDEN, "Only admins can publish results");
  const existing = await prisma.result.findUnique({
    where: { id },
    select: { id: true, grade: true, enrollmentId: true },
  });
  if (!existing) throw new AppError(httpStatus.NOT_FOUND, "Result not found");
  const item = await prisma.$transaction(async (tx) => {
    const publishedResult = await tx.result.update({
      where: { id },
      data: { status: ResultStatus.PUBLISHED, publishedAt: new Date() },
    });
    await tx.enrollment.update({
      where: { id: existing.enrollmentId },
      data: {
        status:
          existing.grade === Grade.F
            ? EnrollmentStatus.FAILED
            : EnrollmentStatus.COMPLETED,
      },
    });
    return publishedResult;
  });
  await audit(userId, AuditAction.PUBLISH_RESULT, item.id);
  return item;
};
const list = async (userId: string, role: Role, query: ResultListQuery) => {
  const student = role === Role.STUDENT ? await getStudent(userId) : undefined;
  return prisma.result.findMany({
    where: {
      deletedAt: null,
      ...(role === Role.STUDENT ? { status: ResultStatus.PUBLISHED } : {}),
      ...(student ? { studentId: student.id } : {}),
      ...(query.examId ? { examId: query.examId } : {}),
    },
    include: {
      exam: {
        include: { section: { include: { course: true, semester: true } } },
      },
      student: {
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};
export const ResultService = { submit, publish, list };
