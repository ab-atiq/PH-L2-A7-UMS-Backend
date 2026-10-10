import crypto from "crypto";
import httpStatus from "http-status";
import {
  AuditAction,
  EnrollmentStatus,
  EntityStatus,
  InvoiceStatus,
  InvoiceType,
  Role,
  StudentSemesterStatus,
} from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import type {
  EnrollmentCreateData,
  EnrollmentListContext,
} from "./enrollment.interface.js";

const pageEnrollments = async ({
  userId,
  role,
  query,
}: EnrollmentListContext) => {
  const page = Math.max(query.page ?? 1, 1);
  const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
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

  const where = {
    deletedAt: null,
    ...(student ? { studentId: student.id } : {}),
    ...(query.status ? { status: query.status as EnrollmentStatus } : {}),
    ...(query.semesterCourseId
      ? { semesterCourseId: query.semesterCourseId }
      : {}),
    ...(faculty
      ? { semesterCourse: { teacherId: faculty.id, deletedAt: null } }
      : {}),
  };
  const [data, total] = await Promise.all([
    prisma.courseEnrollment.findMany({
      where,
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
        semesterCourse: {
          include: {
            course: true,
            programSemester: { include: { program: true } },
            teacher: {
              include: { user: { select: { firstName: true, lastName: true } } },
            },
          },
        },
        semesterEnrollment: true,
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { enrolledAt: "desc" },
    }),
    prisma.courseEnrollment.count({ where }),
  ]);
  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const createEnrollment = async (userId: string, data: EnrollmentCreateData) =>
  prisma.$transaction(async (tx) => {
    const student = await tx.studentProfile.findFirst({
      where: { userId, deletedAt: null },
      select: { id: true, programId: true, studentId: true },
    });
    if (!student?.programId)
      throw new AppError(
        httpStatus.CONFLICT,
        "Student must be assigned to a program before semester enrollment",
      );

    const programSemester = await tx.programSemester.findFirst({
      where: {
        id: data.programSemesterId,
        programId: student.programId,
        deletedAt: null,
        status: EntityStatus.ACTIVE,
      },
      include: { program: { select: { semesterFee: true } } },
    });
    if (!programSemester)
      throw new AppError(
        httpStatus.NOT_FOUND,
        "Active semester not found in the student's program",
      );

    if (programSemester.semesterNumber > 1) {
      const previous = await tx.semesterEnrollment.findFirst({
        where: {
          studentId: student.id,
          programSemester: {
            programId: student.programId,
            semesterNumber: programSemester.semesterNumber - 1,
          },
          deletedAt: null,
        },
        select: { status: true },
      });
      if (previous?.status !== StudentSemesterStatus.COMPLETED) {
        throw new AppError(
          httpStatus.CONFLICT,
          "Complete the previous semester before enrolling in this semester",
        );
      }
    } else {
      const admissionPaid = await tx.feeInvoice.findFirst({
        where: {
          studentId: student.id,
          programId: student.programId,
          type: InvoiceType.ADMISSION,
          status: InvoiceStatus.PAID,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!admissionPaid) {
        let admissionInvoice = await tx.feeInvoice.findFirst({
          where: {
            studentId: student.id,
            programId: student.programId,
            type: InvoiceType.ADMISSION,
            deletedAt: null,
          },
          select: { id: true },
        });
        if (!admissionInvoice) {
          const program = await tx.program.findUniqueOrThrow({
            where: { id: student.programId },
            select: { name: true, admissionFee: true },
          });
          admissionInvoice = await tx.feeInvoice.create({
            data: {
              invoiceNumber: `INV-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
              studentId: student.id,
              type: InvoiceType.ADMISSION,
              programId: student.programId,
              description: `${program.name} admission fee`,
              amount: program.admissionFee,
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          });
        }
        return {
          paymentRequired: true as const,
          reason: "Pay the program admission fee before enrolling in semester one",
          invoiceId: admissionInvoice.id,
        };
      }
    }

    const semesterEnrollment = await tx.semesterEnrollment.upsert({
      where: {
        studentId_programSemesterId: {
          studentId: student.id,
          programSemesterId: programSemester.id,
        },
      },
      create: {
        studentId: student.id,
        programSemesterId: programSemester.id,
        status: StudentSemesterStatus.NOT_STARTED,
      },
      update: {},
    });

    const semesterInvoice = await tx.feeInvoice.findFirst({
      where: {
        studentId: student.id,
        semesterEnrollmentId: semesterEnrollment.id,
        type: InvoiceType.SEMESTER,
        deletedAt: null,
      },
      select: { id: true, status: true },
    });
    if (!semesterInvoice) {
      const invoice = await tx.feeInvoice.create({
        data: {
          invoiceNumber: `INV-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
          studentId: student.id,
          type: InvoiceType.SEMESTER,
          semesterEnrollmentId: semesterEnrollment.id,
          description: `${programSemester.name} tuition fee`,
          amount: programSemester.program.semesterFee,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      return {
        paymentRequired: true as const,
        reason: "Pay the semester fee before course enrollment",
        invoiceId: invoice.id,
      };
    }
    if (semesterInvoice.status !== InvoiceStatus.PAID) {
      return {
        paymentRequired: true as const,
        reason: "Pay the semester fee before course enrollment",
        invoiceId: semesterInvoice.id,
      };
    }

    const existingCourses = await tx.semesterCourse.findMany({
      where: { programSemesterId: programSemester.id, deletedAt: null },
      select: { id: true },
    });
    if (existingCourses.length === 0) {
      throw new AppError(
        httpStatus.CONFLICT,
        "This semester has no courses configured yet",
      );
    }
    await tx.courseEnrollment.createMany({
      data: existingCourses.map(({ id }) => ({
        studentId: student.id,
        semesterCourseId: id,
        semesterEnrollmentId: semesterEnrollment.id,
      })),
      skipDuplicates: true,
    });
    const activated = await tx.semesterEnrollment.update({
      where: { id: semesterEnrollment.id },
      data: { status: StudentSemesterStatus.IN_PROGRESS },
    });
    await tx.studentProfile.update({
      where: { id: student.id },
      data: { currentProgramSemesterId: programSemester.id },
    });
    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: AuditAction.CREATE,
        entity: "SemesterEnrollment",
        entityId: activated.id,
      },
    });
    return { paymentRequired: false as const, semesterEnrollment: activated };
  });

const listEnrollments = pageEnrollments;
const dropEnrollment = async () => {
  throw new AppError(
    httpStatus.FORBIDDEN,
    "Course enrollments are managed by the program curriculum",
  );
};

export const EnrollmentService = {
  listEnrollments,
  createEnrollment,
  dropEnrollment,
};
