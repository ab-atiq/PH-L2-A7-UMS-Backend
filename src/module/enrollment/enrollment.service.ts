import httpStatus from "http-status";
import {
  AuditAction,
  EnrollmentStatus,
  Role,
} from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import type {
  EnrollmentCreateData,
  EnrollmentListContext,
} from "./enrollment.interface.js";

const SEMESTER_CREDIT_LIMIT = 24;
const publicUser = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  avatarUrl: true,
  status: true,
} as const;

const enrollmentSelect = {
  id: true,
  studentId: true,
  sectionId: true,
  status: true,
  enrolledAt: true,
  droppedAt: true,
  finalGrade: true,
  gradePoint: true,
  createdAt: true,
  updatedAt: true,
  student: {
    select: {
      id: true,
      studentId: true,
      user: { select: publicUser },
    },
  },
  section: {
    select: {
      id: true,
      sectionName: true,
      capacity: true,
      room: true,
      schedule: true,
      status: true,
      course: {
        select: { id: true, courseCode: true, title: true, credits: true },
      },
      semester: {
        select: { id: true, name: true, startDate: true, endDate: true },
      },
    },
  },
} as const;

const getStudent = async (userId: string) => {
  const student = await prisma.studentProfile.findFirst({
    where: { userId, deletedAt: null },
    select: { id: true },
  });
  if (!student)
    throw new AppError(httpStatus.NOT_FOUND, "Student profile not found");
  return student;
};

const getFaculty = async (userId: string) => {
  const faculty = await prisma.facultyProfile.findFirst({
    where: { userId, deletedAt: null },
    select: { id: true },
  });
  if (!faculty)
    throw new AppError(httpStatus.NOT_FOUND, "Faculty profile not found");
  return faculty;
};

const audit = async (
  actorId: string,
  action: AuditAction,
  entityId: string,
) => {
  await prisma.auditLog.create({
    data: { actorId, action, entity: "Enrollment", entityId },
  });
};

const createEnrollment = async (userId: string, data: EnrollmentCreateData) =>
  prisma.$transaction(async (tx) => {
    const student = await tx.studentProfile.findFirst({
      where: { userId, deletedAt: null },
      select: {
        id: true,
        enrollments: {
          select: {
            status: true,
            section: {
              select: {
                courseId: true,
                semesterId: true,
                course: { select: { credits: true } },
              },
            },
          },
        },
      },
    });
    if (!student)
      throw new AppError(httpStatus.NOT_FOUND, "Student profile not found");

    const section = await tx.section.findFirst({
      where: { id: data.sectionId, deletedAt: null },
      select: {
        id: true,
        courseId: true,
        semesterId: true,
        capacity: true,
        status: true,
        course: { select: { credits: true, status: true } },
        semester: {
          select: {
            status: true,
            registrationStart: true,
            registrationEnd: true,
          },
        },
        enrollments: {
          where: { status: EnrollmentStatus.ENROLLED },
          select: { id: true },
        },
      },
    });
    if (!section) throw new AppError(httpStatus.NOT_FOUND, "Section not found");

    const now = new Date();
    if (
      section.status !== "PUBLISHED" ||
      section.course.status !== "PUBLISHED"
    ) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Section or course is not available",
      );
    }
    if (
      section.semester.status !== "REGISTRATION_OPEN" ||
      now < section.semester.registrationStart ||
      now > section.semester.registrationEnd
    ) {
      throw new AppError(httpStatus.BAD_REQUEST, "Registration is not open");
    }
    if (section.enrollments.length >= section.capacity) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Section capacity has been reached",
      );
    }

    const existing = await tx.enrollment.findUnique({
      where: {
        studentId_sectionId: {
          studentId: student.id,
          sectionId: data.sectionId,
        },
      },
      select: { id: true, status: true },
    });
    if (existing?.status === EnrollmentStatus.ENROLLED) {
      throw new AppError(
        httpStatus.CONFLICT,
        "Already enrolled in this section",
      );
    }

    const completed = student.enrollments
      .filter((item) => item.status === EnrollmentStatus.COMPLETED)
      .map((item) => item.section.courseId);
    if (completed.includes(section.courseId)) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Course has already been completed",
      );
    }

    const credits = student.enrollments
      .filter(
        (item) =>
          item.status === EnrollmentStatus.ENROLLED &&
          item.section.semesterId === section.semesterId,
      )
      .reduce((sum, item) => sum + item.section.course.credits, 0);
    if (credits + section.course.credits > SEMESTER_CREDIT_LIMIT) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Semester credit limit is ${SEMESTER_CREDIT_LIMIT}`,
      );
    }

    // const prerequisites = await tx.coursePrerequisite.findMany({
    //   where: { courseId: section.courseId },
    //   select: { prerequisiteId: true },
    // });
    // if (
    //   prerequisites.some((item) => !completed.includes(item.prerequisiteId))
    // ) {
    //   throw new AppError(
    //     httpStatus.BAD_REQUEST,
    //     "Course prerequisites are not completed",
    //   );
    // }

    const enrollment = existing
      ? await tx.enrollment.update({
          where: { id: existing.id },
          data: {
            status: EnrollmentStatus.ENROLLED,
            enrolledAt: now,
            droppedAt: null,
            deletedAt: null,
          },
          select: enrollmentSelect,
        })
      : await tx.enrollment.create({
          data: { studentId: student.id, sectionId: data.sectionId },
          select: enrollmentSelect,
        });

    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: AuditAction.ENROLL,
        entity: "Enrollment",
        entityId: enrollment.id,
      },
    });
    return enrollment;
  });

const dropEnrollment = async (userId: string, id: string) => {
  const student = await getStudent(userId);
  const enrollment = await prisma.enrollment.findFirst({
    where: { id, studentId: student.id, status: EnrollmentStatus.ENROLLED },
    select: { id: true },
  });
  if (!enrollment)
    throw new AppError(httpStatus.NOT_FOUND, "Enrollment not found");

  const result = await prisma.enrollment.update({
    where: { id },
    data: { status: EnrollmentStatus.DROPPED, droppedAt: new Date() },
    select: enrollmentSelect,
  });
  await audit(userId, AuditAction.DROP_ENROLLMENT, result.id);
  return result;
};

const listEnrollments = async ({
  userId,
  role,
  query,
}: EnrollmentListContext) => {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
  const student = role === Role.STUDENT ? await getStudent(userId) : undefined;
  const faculty = role === Role.FACULTY ? await getFaculty(userId) : undefined;

  const where = {
    ...(role === Role.ADMIN ? {} : { deletedAt: null }),
    ...(student ? { studentId: student.id } : {}),
    ...(faculty
      ? { section: { facultyAssignments: { some: { facultyId: faculty.id } } } }
      : {}),
    ...(query.status ? { status: query.status as EnrollmentStatus } : {}),
    ...(query.sectionId ? { sectionId: query.sectionId } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.enrollment.findMany({
      where,
      select:
        role === Role.ADMIN
          ? { ...enrollmentSelect, deletedAt: true }
          : enrollmentSelect,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: query.sortOrder || "desc" },
    }),

    prisma.enrollment.count({ where }),
  ]);

  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const EnrollmentService = {
  createEnrollment,
  dropEnrollment,
  listEnrollments,
};
