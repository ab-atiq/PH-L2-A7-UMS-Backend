import type { UploadApiResponse } from "cloudinary";
import httpStatus from "http-status";
import {
  AuditAction,
  Role,
  UserStatus,
} from "../../../generated/prisma/enums.js";
import { cloudinary } from "../../lib/cloudinary.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";

type AdminUserListQuery = {
  page?: number | string;
  limit?: number | string;
  search?: string;
  role?: Role;
  status?: UserStatus;
  includeDeleted?: boolean | string;
};

type AdminUserUpdate = {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
};

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

const adminUserSelect = {
  ...publicUserSelect,
  deletedAt: true,
  studentProfile: {
    select: {
      id: true,
      studentId: true,
      program: { select: { id: true, name: true, code: true } },
      department: { select: { id: true, name: true, code: true } },
      currentProgramSemester: { select: { id: true, name: true } },
    },
  },
  facultyProfile: {
    select: {
      id: true,
      employeeId: true,
      designation: true,
      department: { select: { id: true, name: true, code: true } },
    },
  },
} as const;

const adminAudit = async (
  actorId: string,
  action: AuditAction,
  userId: string,
) => {
  await prisma.auditLog.create({
    data: { actorId, action, entity: "User", entityId: userId },
  });
};

const listUsersByAdmin = async (query: AdminUserListQuery) => {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
  const includeDeleted =
    query.includeDeleted === true || query.includeDeleted === "true";
  const search = query.search?.trim();
  const where = {
    ...(includeDeleted ? {} : { deletedAt: null }),
    ...(query.role ? { role: query.role } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" as const } },
            { firstName: { contains: search, mode: "insensitive" as const } },
            { lastName: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: adminUserSelect,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.user.count({ where }),
  ]);
  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const getUserByAdmin = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: adminUserSelect,
  });
  if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found");
  return user;
};

const updateUserByAdmin = async (
  userId: string,
  data: AdminUserUpdate,
  actorId: string,
) => {
  const existing = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true },
  });
  if (!existing)
    throw new AppError(httpStatus.NOT_FOUND, "Active user not found");
  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: adminUserSelect,
  });
  await adminAudit(actorId, AuditAction.UPDATE, userId);
  return user;
};

const updateUserStatusByAdmin = async (
  userId: string,
  status: UserStatus,
  actorId: string,
) => {
  const existing = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true },
  });
  if (!existing)
    throw new AppError(httpStatus.NOT_FOUND, "Active user not found");
  const user = await prisma.$transaction(async (transaction) => {
    const updated = await transaction.user.update({
      where: { id: userId },
      data: { status },
      select: adminUserSelect,
    });
    if (
      status === UserStatus.SUSPENDED ||
      status === UserStatus.INACTIVE ||
      status === UserStatus.PENDING_VERIFICATION
    ) {
      await transaction.refreshToken.updateMany({
        where: { userId, revoked: false },
        data: { revoked: true, revokedAt: new Date() },
      });
    }
    return updated;
  });
  await adminAudit(actorId, AuditAction.UPDATE, userId);
  return user;
};

const deleteUserByAdmin = async (userId: string, actorId: string) => {
  const existing = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true },
  });
  if (!existing)
    throw new AppError(httpStatus.NOT_FOUND, "Active user not found");
  const user = await prisma.$transaction(async (transaction) => {
    const deleted = await transaction.user.update({
      where: { id: userId },
      data: { deletedAt: new Date(), status: UserStatus.INACTIVE },
      select: adminUserSelect,
    });
    await transaction.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true, revokedAt: new Date() },
    });
    return deleted;
  });
  await adminAudit(actorId, AuditAction.DELETE, userId);
  return user;
};

const getMyProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...publicUserSelect,
      studentProfile: {
        include: {
          program: true,
          department: true,
          currentProgramSemester: true,
        },
      },
      facultyProfile: { include: { department: true } },
    },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }
  return user;
};

const updateMyProfile = async (
  userId: string,
  payload: { firstName?: string; lastName?: string; phone?: string | null },
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(payload.firstName === undefined
        ? {}
        : { firstName: payload.firstName }),
      ...(payload.lastName === undefined ? {} : { lastName: payload.lastName }),
      ...(payload.phone === undefined ? {} : { phone: payload.phone }),
    },
    select: publicUserSelect,
  });
};

const uploadProfileImage = async (buffer: Buffer, userId: string) => {
  // i want to delete previous image from cloudinary if it exists. then upload new image and update user record with new image url.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarUrl: true },
  });

  if (user?.avatarUrl) {
    const publicId = user.avatarUrl.split("/").pop()?.split(".")[0];
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
    }
  }

  const cloudinaryResult = await new Promise<UploadApiResponse>(
    (resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ resource_type: "auto" }, (error, result) => {
          if (error) {
            return reject(error);
          }
          if (!result) {
            return reject(new Error("No result returned from Cloudinary"));
          }
          resolve(result);
        })
        .end(buffer);
    },
  );

  return prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: cloudinaryResult.secure_url },
    select: publicUserSelect,
  });
};

export const UserServices = {
  listUsersByAdmin,
  getUserByAdmin,
  updateUserByAdmin,
  updateUserStatusByAdmin,
  deleteUserByAdmin,
  getMyProfile,
  updateMyProfile,
  uploadProfileImage,
};
