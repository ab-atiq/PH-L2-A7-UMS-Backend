import type { UploadApiResponse } from "cloudinary";
import httpStatus from "http-status";
import { cloudinary } from "../../lib/cloudinary.js";
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

const getMyProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...publicUserSelect,
      studentProfile: {
        include: { program: true, department: true, currentSemester: true },
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
  getMyProfile,
  updateMyProfile,
  uploadProfileImage,
};
