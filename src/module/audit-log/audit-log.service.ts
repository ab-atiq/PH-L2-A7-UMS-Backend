import { prisma } from "../../lib/prisma.js";
import type { AuditLogListQuery } from "./audit-log.interface.js";

const list = async (query: AuditLogListQuery) => {
  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 20), 100);
  const where: any = {
    ...(query.action ? { action: query.action } : {}),
    ...(query.entity ? { entity: query.entity } : {}),
    ...(query.actorId ? { actorId: query.actorId } : {}),
    ...(query.search
      ? { entity: { contains: query.search, mode: "insensitive" } }
      : {}),
  };
  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        actor: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: query.sortOrder || "desc" },
    }),
    prisma.auditLog.count({ where }),
  ]);
  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};
export const AuditLogService = { list };
