import httpStatus from "http-status";
import { AuditAction, SectionStatus } from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import type {
  FacultySectionListQuery,
  SectionFacultyData,
} from "./section-faculty.interface.js";

const listSectionsForFaculty = async (
  userId: string,
  query: FacultySectionListQuery = {},
) => {
  const faculty = await prisma.facultyProfile.findFirst({
    where: { userId, deletedAt: null },
    select: { id: true },
  });
  if (!faculty) {
    throw new AppError(httpStatus.NOT_FOUND, "Faculty profile not found");
  }

  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
  const where = {
    deletedAt: null,
    ...(query.courseId ? { courseId: query.courseId } : {}),
    ...(query.semesterId ? { semesterId: query.semesterId } : {}),
    ...(query.status ? { status: query.status as SectionStatus } : {}),
    ...(query.search
      ? {
          OR: [
            {
              sectionName: {
                contains: query.search.trim(),
                mode: "insensitive" as const,
              },
            },
            {
              course: {
                OR: [
                  {
                    courseCode: {
                      contains: query.search.trim(),
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    title: {
                      contains: query.search.trim(),
                      mode: "insensitive" as const,
                    },
                  },
                ],
              },
            },
            {
              semester: {
                name: {
                  contains: query.search.trim(),
                  mode: "insensitive" as const,
                },
              },
            },
          ],
        }
      : {}),
    facultyAssignments: { some: { facultyId: faculty.id } },
  };

  const [data, total] = await Promise.all([
    prisma.section.findMany({
      where,
      select: {
        id: true,
        courseId: true,
        semesterId: true,
        sectionName: true,
        capacity: true,
        room: true,
        schedule: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        course: {
          select: { id: true, courseCode: true, title: true, credits: true },
        },
        semester: {
          select: { id: true, name: true, startDate: true, endDate: true },
        },
        facultyAssignments: {
          where: { facultyId: faculty.id },
          select: {
            id: true,
            facultyId: true,
            isPrimary: true,
            createdAt: true,
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: query.sortOrder || "desc" },
    }),
    prisma.section.count({ where }),
  ]);

  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const assignFacultyToSection = async (
  data: SectionFacultyData,
  actorId: string,
) => {
  const [section, faculty] = await Promise.all([
    prisma.section.findFirst({
      where: { id: data.sectionId, deletedAt: null },
    }),

    prisma.facultyProfile.findFirst({
      where: { id: data.facultyId, deletedAt: null },
    }),
  ]);

  if (!section) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Active section profile not found",
    );
  } else if (!faculty) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Active faculty profile not found",
    );
  }

  if (data.isPrimary)
    await prisma.sectionFaculty.updateMany({
      where: { sectionId: data.sectionId },
      data: { isPrimary: false },
    });

  const item = await prisma.sectionFaculty.upsert({
    where: {
      sectionId_facultyId: {
        sectionId: data.sectionId,
        facultyId: data.facultyId,
      },
    },
    update: { isPrimary: data.isPrimary ?? true },
    create: { ...data, isPrimary: data.isPrimary ?? true },
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: AuditAction.UPDATE,
      entity: "SectionFaculty",
      entityId: item.id,
    },
  });

  return item;
};

const removeFacultyFromSection = async (
  sectionId: string,
  facultyId: string,
  actorId: string,
) => {
  const item = await prisma.sectionFaculty.delete({
    where: { sectionId_facultyId: { sectionId, facultyId } },
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: AuditAction.DELETE,
      entity: "SectionFaculty",
      entityId: item.id,
    },
  });

  return item;
};

export const SectionFacultyService = {
  listSectionsForFaculty,
  assignFacultyToSection,
  removeFacultyFromSection,
};
