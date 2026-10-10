import crypto from "crypto";
import httpStatus from "http-status";
import {
  AuditAction,
  InvoiceStatus,
  InvoiceType,
  Role,
} from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import type { InvoiceListQuery } from "./invoice.interface.js";
import type { CreateInvoiceData } from "./invoice.validation.js";

const page = async (userId: string, role: Role, query: InvoiceListQuery) => {
  const student =
    role === Role.STUDENT
      ? await prisma.studentProfile.findFirst({
          where: { userId, deletedAt: null },
          select: { id: true },
        })
      : null;
  if (role === Role.STUDENT && !student)
    throw new AppError(httpStatus.NOT_FOUND, "Student profile not found");

  const pageNumber = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
  const where = {
    deletedAt: null,
    ...(student ? { studentId: student.id } : {}),
    ...(query.status ? { status: query.status as InvoiceStatus } : {}),
  };
  const [data, total] = await Promise.all([
    prisma.feeInvoice.findMany({
      where,
      include: {
        program: true,
        semesterEnrollment: {
          include: { programSemester: true },
        },
        student: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        payments: true,
      },
      skip: (pageNumber - 1) * limit,
      take: limit,
      orderBy: { dueDate: "asc" },
    }),
    prisma.feeInvoice.count({ where }),
  ]);
  return {
    data,
    meta: {
      page: pageNumber,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const create = async (data: CreateInvoiceData, actorId: string) => {
  const student = await prisma.studentProfile.findFirst({
    where: { id: data.studentId, deletedAt: null },
    select: { id: true, programId: true },
  });
  if (!student)
    throw new AppError(httpStatus.NOT_FOUND, "Student profile not found");

  let amount: string;
  let description: string;
  let programId: string | null = null;
  let semesterEnrollmentId: string | null = null;
  const existingWhere =
    data.type === "ADMISSION"
      ? {
          studentId: student.id,
          type: InvoiceType.ADMISSION,
          programId: data.programId,
        }
      : {
          studentId: student.id,
          type: InvoiceType.SEMESTER,
          semesterEnrollmentId: data.semesterEnrollmentId,
        };

  if (data.type === "ADMISSION") {
    const program = await prisma.program.findFirst({
      where: { id: data.programId, deletedAt: null },
      select: { id: true, name: true, admissionFee: true },
    });
    if (!program || student.programId !== program.id)
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Admission invoice program must match the student's assigned program",
      );
    amount = program.admissionFee.toString();
    description = `${program.name} admission fee`;
    programId = program.id;
  } else {
    const enrollment = await prisma.semesterEnrollment.findFirst({
      where: { id: data.semesterEnrollmentId, studentId: student.id, deletedAt: null },
      include: {
        programSemester: {
          include: { program: { select: { name: true, semesterFee: true } } },
        },
      },
    });
    if (!enrollment)
      throw new AppError(httpStatus.NOT_FOUND, "Semester enrollment not found");
    amount = enrollment.programSemester.program.semesterFee.toString();
    description = `${enrollment.programSemester.name} tuition fee`;
    semesterEnrollmentId = enrollment.id;
  }

  const existing = await prisma.feeInvoice.findFirst({
    where: { ...existingWhere, deletedAt: null },
    select: { id: true },
  });
  if (existing)
    throw new AppError(
      httpStatus.CONFLICT,
      "An invoice already exists for this program or semester",
    );
  const invoice = await prisma.feeInvoice.create({
    data: {
      invoiceNumber: `INV-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      studentId: student.id,
      type: data.type,
      programId,
      semesterEnrollmentId,
      description,
      amount,
      dueDate: data.dueDate,
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId,
      action: AuditAction.CREATE_INVOICE,
      entity: "FeeInvoice",
      entityId: invoice.id,
    },
  });
  return invoice;
};

const getById = async (userId: string, role: Role, id: string) => {
  const student =
    role === Role.STUDENT
      ? await prisma.studentProfile.findFirst({
          where: { userId, deletedAt: null },
          select: { id: true },
        })
      : null;
  if (role === Role.STUDENT && !student)
    throw new AppError(httpStatus.NOT_FOUND, "Student profile not found");
  const invoice = await prisma.feeInvoice.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(student ? { studentId: student.id } : {}),
    },
    include: {
      program: true,
      semesterEnrollment: { include: { programSemester: true } },
      student: {
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      },
      payments: true,
    },
  });
  if (!invoice) throw new AppError(httpStatus.NOT_FOUND, "Invoice not found");
  return invoice;
};

export const InvoiceService = { page, create, getById };
