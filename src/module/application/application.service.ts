import httpStatus from "http-status";
import {
  AuditAction,
  ApplicationStatus,
  Role,
} from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import type {
  AdminApplicationListQuery,
  CreateRoleApplication,
} from "./application.validation.js";

const listApplicationsByAdmin = async (query: AdminApplicationListQuery) => {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
  const search = query.search?.trim();
  const where = {
    ...(query.status ? { status: query.status as ApplicationStatus } : {}),
    ...(query.requestedRole ? { requestedRole: query.requestedRole } : {}),
    ...(search
      ? {
          OR: [
            {
              user: {
                firstName: { contains: search, mode: "insensitive" as const },
              },
            },
            {
              user: {
                lastName: { contains: search, mode: "insensitive" as const },
              },
            },
            {
              user: {
                email: { contains: search, mode: "insensitive" as const },
              },
            },
            {
              programInterest: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              departmentInterest: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
  };
  const [data, total] = await Promise.all([
    prisma.roleApplication.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatarUrl: true,
            role: true,
            status: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.roleApplication.count({ where }),
  ]);
  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const updateApplicationStatus = async (
  applicationId: string,
  status: ApplicationStatus,
  actorId: string,
) => {
  return prisma.$transaction(async (transaction) => {
    const application = await transaction.roleApplication.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        status: true,
        requestedRole: true,
        userId: true,
        user: { select: { role: true } },
      },
    });
    if (!application) {
      throw new AppError(httpStatus.NOT_FOUND, "Role application not found");
    }

    let roleChanged = false;
    if (status === ApplicationStatus.APPROVED) {
      const requestedRole =
        application.requestedRole === "STUDENT" ? Role.STUDENT : Role.FACULTY;
      if (
        application.user.role !== Role.USER &&
        application.user.role !== requestedRole
      ) {
        throw new AppError(
          httpStatus.CONFLICT,
          "The applicant already has a different university role",
        );
      }
      if (application.user.role !== requestedRole) {
        await transaction.user.update({
          where: { id: application.userId },
          data: { role: requestedRole },
        });
        roleChanged = true;
      }
    }

    const updated = await transaction.roleApplication.update({
      where: { id: applicationId },
      data: { status },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatarUrl: true,
            role: true,
            status: true,
          },
        },
      },
    });
    await transaction.auditLog.create({
      data: {
        actorId,
        action: AuditAction.ADMIN_ACTION,
        entity: "RoleApplication",
        entityId: applicationId,
      },
    });
    if (roleChanged) {
      await transaction.auditLog.create({
        data: {
          actorId,
          action: AuditAction.ROLE_CHANGE,
          entity: "User",
          entityId: application.userId,
        },
      });
    }
    return updated;
  });
};

const createRoleApplication = async (
  userId: string,
  payload: CreateRoleApplication,
) => {
  const existing = await prisma.roleApplication.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (existing) {
    throw new AppError(
      httpStatus.CONFLICT,
      "You have already submitted an application",
    );
  }

  const applicationData =
    payload.requestedRole === "STUDENT"
      ? {
          userId,
          requestedRole: payload.requestedRole,
          programInterest: payload.programInterest,
          statement: payload.statement,
        }
      : {
          userId,
          requestedRole: payload.requestedRole,
          departmentInterest: payload.departmentInterest,
          highestQualification: payload.highestQualification,
          specialization: payload.specialization ?? null,
          statement: payload.statement,
        };

  return prisma.roleApplication.create({ data: applicationData });
};

const getMyRoleApplication = (userId: string) =>
  prisma.roleApplication.findUnique({ where: { userId } });

export const ApplicationService = {
  listApplicationsByAdmin,
  updateApplicationStatus,
  createRoleApplication,
  getMyRoleApplication,
};
