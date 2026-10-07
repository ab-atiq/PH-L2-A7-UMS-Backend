import httpStatus from "http-status";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import type { CreateRoleApplication } from "./application.validation.js";

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
  createRoleApplication,
  getMyRoleApplication,
};
