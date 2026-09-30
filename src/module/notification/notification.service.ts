import httpStatus from "http-status";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import type { NotificationListQuery } from "./notification.interface.js";

const listMine = async (userId: string, query: NotificationListQuery) => {
  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 20), 100);
  const where = {
    userId,
    ...(query.isRead === undefined ? {} : { isRead: query.isRead }),
  };
  const [data, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.notification.count({ where }),
  ]);
  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};
const create = async (data: any) => {
  const user = await prisma.user.findUnique({ where: { id: data.userId } });
  if (!user || user.deletedAt)
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  return prisma.notification.create({ data });
};
const markRead = async (userId: string, id: string) => {
  const notification = await prisma.notification.findFirst({
    where: { id, userId },
  });
  if (!notification)
    throw new AppError(httpStatus.NOT_FOUND, "Notification not found");
  return prisma.notification.update({
    where: { id },
    data: { isRead: true, readAt: new Date() },
  });
};
export const NotificationService = { listMine, create, markRead };
