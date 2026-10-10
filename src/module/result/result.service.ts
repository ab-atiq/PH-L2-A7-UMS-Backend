import httpStatus from "http-status";
import {
  AuditAction,
  EnrollmentStatus,
  ExamType,
  Grade,
  ResultStatus,
  Role,
  StudentSemesterStatus,
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

const submit = async (userId: string, data: ResultSubmitData) => {
  const exam = await prisma.exam.findFirst({
    where: { id: data.examId, deletedAt: null },
    select: { id: true, semesterCourseId: true, totalMarks: true },
  });
  if (!exam) throw new AppError(httpStatus.NOT_FOUND, "Exam not found");
  await ensureCourseAccess(exam.semesterCourseId, userId);
  const enrollment = await prisma.courseEnrollment.findFirst({
    where: {
      id: data.courseEnrollmentId,
      studentId: data.studentId,
      semesterCourseId: exam.semesterCourseId,
      status: EnrollmentStatus.ENROLLED,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!enrollment)
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Matching active course enrollment not found",
    );
  if (data.marksObtained > exam.totalMarks)
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Marks cannot exceed total marks",
    );
  const grade = gradeFor((data.marksObtained / exam.totalMarks) * 100);
  const item = await prisma.result.upsert({
    where: {
      examId_studentId: { examId: data.examId, studentId: data.studentId },
    },
    update: {
      courseEnrollmentId: enrollment.id,
      marksObtained: data.marksObtained,
      ...grade,
      enteredById: userId,
      status: ResultStatus.SUBMITTED,
    },
    create: {
      examId: data.examId,
      studentId: data.studentId,
      courseEnrollmentId: enrollment.id,
      marksObtained: data.marksObtained,
      ...grade,
      enteredById: userId,
      status: ResultStatus.SUBMITTED,
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId: userId,
      action: AuditAction.CREATE_RESULT,
      entity: "Result",
      entityId: item.id,
    },
  });
  return item;
};

const publishExamResults = async (userId: string, examId: string) =>
  prisma.$transaction(async (tx) => {
    const exam = await tx.exam.findFirst({
      where: { id: examId, deletedAt: null },
      include: {
        semesterCourse: {
          include: {
            courseEnrollments: {
              where: { deletedAt: null },
              select: { id: true, studentId: true, semesterEnrollmentId: true },
            },
            programSemester: { select: { id: true } },
          },
        },
        results: {
          where: { deletedAt: null, status: ResultStatus.SUBMITTED },
          select: { id: true, studentId: true, grade: true, gradePoint: true },
        },
      },
    });
    if (!exam) throw new AppError(httpStatus.NOT_FOUND, "Exam not found");
    await ensureCourseAccess(exam.semesterCourseId, userId);
    if (exam.results.length === 0)
      throw new AppError(httpStatus.CONFLICT, "There are no submitted results to publish");
    const publishedAt = new Date();
    await tx.result.updateMany({
      where: { examId, status: ResultStatus.SUBMITTED, deletedAt: null },
      data: { status: ResultStatus.PUBLISHED, publishedAt },
    });
    await tx.exam.update({
      where: { id: examId },
      data: { status: "COMPLETED" },
    });
    if (exam.examType === ExamType.FINAL) {
      for (const result of exam.results) {
        if (!result.grade || result.gradePoint === null) continue;
        await tx.courseEnrollment.updateMany({
          where: {
            studentId: result.studentId,
            semesterCourseId: exam.semesterCourseId,
            deletedAt: null,
          },
          data: {
            status:
              result.grade === Grade.F
                ? EnrollmentStatus.FAILED
                : EnrollmentStatus.COMPLETED,
            finalGrade: result.grade,
            gradePoint: result.gradePoint,
          },
        });
      }
      const semesterEnrollments = await tx.semesterEnrollment.findMany({
        where: {
          id: {
            in: exam.semesterCourse.courseEnrollments.map(
              (item) => item.semesterEnrollmentId,
            ),
          },
          deletedAt: null,
        },
        include: {
          courseEnrollments: {
            where: { deletedAt: null },
            select: {
              status: true,
              gradePoint: true,
              semesterCourse: {
                select: { course: { select: { credits: true } } },
              },
            },
          },
        },
      });
      for (const semesterEnrollment of semesterEnrollments) {
        const statuses = semesterEnrollment.courseEnrollments.map(
          (course) => course.status,
        );
        const complete =
          statuses.length > 0 &&
          statuses.every(
            (status) =>
              status === EnrollmentStatus.COMPLETED ||
              status === EnrollmentStatus.FAILED,
          );
        if (!complete) continue;
        const hasFailure = statuses.includes(EnrollmentStatus.FAILED);
        const status = hasFailure
          ? StudentSemesterStatus.FAILED
          : StudentSemesterStatus.COMPLETED;
        const credits = semesterEnrollment.courseEnrollments.reduce(
          (total, enrollment) =>
            total + enrollment.semesterCourse.course.credits,
          0,
        );
        const qualityPoints = semesterEnrollment.courseEnrollments.reduce(
          (total, enrollment) =>
            total +
            enrollment.semesterCourse.course.credits *
              (enrollment.gradePoint ?? 0),
          0,
        );
        await tx.semesterEnrollment.update({
          where: { id: semesterEnrollment.id },
          data: {
            status,
            semesterGpa: credits ? qualityPoints / credits : null,
            ...(status === StudentSemesterStatus.COMPLETED
              ? { completedAt: publishedAt }
              : {}),
          },
        });
        if (status === StudentSemesterStatus.COMPLETED) {
          const current = await tx.programSemester.findUnique({
            where: { id: exam.semesterCourse.programSemester.id },
            select: { programId: true, semesterNumber: true },
          });
          if (!current) continue;
          const next = await tx.programSemester.findFirst({
            where: {
              programId: current.programId,
              semesterNumber: current.semesterNumber + 1,
              deletedAt: null,
            },
            select: { id: true },
          });
          if (next) {
            await tx.studentProfile.update({
              where: { id: semesterEnrollment.studentId },
              data: { currentProgramSemesterId: next.id },
            });
          }
        }
      }
    }
    const resultIds = exam.results.map((item) => item.id);
    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: AuditAction.PUBLISH_RESULT,
        entity: "Exam",
        entityId: examId,
      },
    });
    return { publishedResultIds: resultIds };
  });

const publish = async (userId: string, id: string) => {
  const result = await prisma.result.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, examId: true, exam: { select: { semesterCourseId: true } } },
  });
  if (!result) throw new AppError(httpStatus.NOT_FOUND, "Result not found");
  await ensureCourseAccess(result.exam.semesterCourseId, userId);
  return publishExamResults(userId, result.examId);
};

const list = async (userId: string, role: Role, query: ResultListQuery) => {
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
  return prisma.result.findMany({
    where: {
      deletedAt: null,
      ...(role === Role.STUDENT ? { status: ResultStatus.PUBLISHED } : {}),
      ...(student ? { studentId: student.id } : {}),
      ...(query.examId ? { examId: query.examId } : {}),
      ...(faculty
        ? { exam: { semesterCourse: { teacherId: faculty.id } } }
        : {}),
    },
    include: {
      exam: {
        include: {
          semesterCourse: {
            include: { course: true, programSemester: { include: { program: true } } },
          },
        },
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

export const ResultService = { submit, publish, publishExamResults, list };
