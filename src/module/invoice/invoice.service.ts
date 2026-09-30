import crypto from "crypto";
import httpStatus from "http-status";
import { AuditAction, Role } from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import type { InvoiceListQuery } from "./invoice.interface.js";

const page = async (userId: string, role: Role, query: InvoiceListQuery) => {
  const student =
    role === Role.STUDENT
      ? await prisma.studentProfile.findUnique({ where: { userId } })
      : null;
  if (role === Role.STUDENT && !student) {
    throw new AppError(httpStatus.NOT_FOUND, "Student profile not found");
  }

  const pageNumber = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 20), 100);
  const where: any = {
    deletedAt: null,
    ...(student ? { studentId: student.id } : {}),
    ...(query.status ? { status: query.status } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.feeInvoice.findMany({
      where,
      include: {
        semester: true,
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

const create = async (data: any, actorId: string) => {
  const student = await prisma.studentProfile.findUnique({
    where: { id: data.studentId },
  });

  if (!student) {
    throw new AppError(httpStatus.NOT_FOUND, "Student profile not found");
  }

  if (
    data.semesterId &&
    !(await prisma.semester.findFirst({
      where: { id: data.semesterId, deletedAt: null },
    }))
  ) {
    throw new AppError(httpStatus.NOT_FOUND, "Semester not found");
  }

  const invoice = await prisma.feeInvoice.create({
    data: {
      ...data,
      invoiceNumber: `INV-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
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
      ? await prisma.studentProfile.findUnique({ where: { userId } })
      : null;

  if (role === Role.STUDENT && !student) {
    throw new AppError(httpStatus.NOT_FOUND, "Student profile not found");
  }

  const invoice = await prisma.feeInvoice.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(student ? { studentId: student.id } : {}),
    },
    include: {
      semester: true,
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

  if (!invoice) {
    throw new AppError(httpStatus.NOT_FOUND, "Invoice not found");
  }

  return invoice;
};

export const InvoiceService = { page, create, getById };
