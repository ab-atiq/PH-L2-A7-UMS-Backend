import httpStatus from "http-status";
import {
  InvoiceStatus,
  PaymentStatus,
  UserStatus,
} from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";

const publicUserSelect = {
  id: true,
  email: true,
  role: true,
  status: true,
  firstName: true,
  lastName: true,
  phone: true,
  avatarUrl: true,
  emailVerified: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

const getDashboardStats = async () => {
  const activeRecord = { deletedAt: null } as const;

  const [
    users,
    students,
    faculty,
    departments,
    programs,
    courses,
    semesters,
    sections,
    enrollments,
    invoices,
    payments,
    revenue,
  ] = await Promise.all([
    prisma.user.count({ where: activeRecord }),
    prisma.studentProfile.count({ where: activeRecord }),
    prisma.facultyProfile.count({ where: activeRecord }),
    prisma.department.count({ where: activeRecord }),
    prisma.program.count({ where: activeRecord }),
    prisma.course.count({ where: activeRecord }),
    prisma.semester.count({ where: activeRecord }),
    prisma.section.count({ where: activeRecord }),
    prisma.enrollment.count({ where: activeRecord }),
    Promise.all(
      Object.values(InvoiceStatus).map(
        async (status) =>
          [
            status,
            await prisma.feeInvoice.count({
              where: { ...activeRecord, status },
            }),
          ] as const,
      ),
    ),
    Promise.all(
      Object.values(PaymentStatus).map(
        async (status) =>
          [
            status,
            await prisma.payment.count({
              where: { ...activeRecord, status },
            }),
          ] as const,
      ),
    ),
    prisma.payment.aggregate({
      where: { ...activeRecord, status: PaymentStatus.SUCCESS },
      _sum: { amount: true },
    }),
  ]);

  return {
    totals: {
      users,
      students,
      faculty,
      departments,
      programs,
      courses,
      semesters,
      sections,
      enrollments,
    },
    invoices: Object.fromEntries(invoices),
    payments: Object.fromEntries(payments),
    revenue: {
      successfulPayments: revenue._sum.amount?.toString() ?? "0.00",
      currency: "BDT",
    },
  };
};

const updateUserStatus = async (
  adminUserId: string,
  targetUserId: string,
  status: UserStatus,
) => {
  if (adminUserId === targetUserId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "You cannot change your own account status",
    );
  }

  const targetUser = await prisma.user.findFirst({
    where: { id: targetUserId, deletedAt: null },
    select: { id: true },
  });
  if (!targetUser) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  const updatedUser = await prisma.user.update({
    where: { id: targetUserId },
    data: { status },
    select: publicUserSelect,
  });

  await prisma.auditLog.create({
    data: {
      actorId: adminUserId,
      action: "ADMIN_ACTION",
      entity: "User",
      entityId: targetUserId,
      metadata: { status },
    },
  });

  return updatedUser;
};

export const AdminService = { getDashboardStats, updateUserStatus };
