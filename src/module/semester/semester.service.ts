import httpStatus from "http-status";
import { AuditAction, EntityStatus } from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import type {
  SemesterCreateData,
  SemesterListQuery,
  SemesterUpdateData,
} from "./semester.interface.js";

const listSemesters = async (query: SemesterListQuery) => {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
  const where = {
    deletedAt: null,
    ...(query.programId ? { programId: query.programId } : {}),
    ...(query.status ? { status: query.status as EntityStatus } : {}),
    ...(query.search
      ? { name: { contains: query.search, mode: "insensitive" as const } }
      : {}),
  };
  const [data, total] = await Promise.all([
    prisma.programSemester.findMany({
      where,
      include: {
        program: { select: { id: true, name: true, code: true, degreeType: true } },
        semesterCourses: {
          where: { deletedAt: null },
          include: {
            course: true,
            teacher: {
              include: {
                user: {
                  select: { id: true, firstName: true, lastName: true, email: true },
                },
              },
            },
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [
        { program: { name: "asc" } },
        { semesterNumber: "asc" },
      ],
    }),
    prisma.programSemester.count({ where }),
  ]);
  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const semesterList = listSemesters;
const semesterListByAdmin = listSemesters;

const getSingleSemester = async (id: string) => {
  const item = await prisma.programSemester.findFirst({
    where: { id, deletedAt: null },
    include: {
      program: true,
      semesterCourses: {
        where: { deletedAt: null },
        include: { course: true, teacher: { include: { user: true } } },
      },
    },
  });
  if (!item) throw new AppError(httpStatus.NOT_FOUND, "Program semester not found");
  return item;
};

const getSingleSemesterByAdmin = getSingleSemester;

const audit = async (actorId: string, action: AuditAction, entityId: string) =>
  prisma.auditLog.create({
    data: { actorId, action, entity: "ProgramSemester", entityId },
  });

const createSemester = async (data: SemesterCreateData, actorId: string) => {
  const program = await prisma.program.findFirst({
    where: { id: data.programId, deletedAt: null },
    select: { id: true, totalSemesters: true },
  });
  if (!program) throw new AppError(httpStatus.NOT_FOUND, "Program not found");
  if (data.semesterNumber > program.totalSemesters) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Semester number exceeds the program's degree length",
    );
  }
  const item = await prisma.programSemester.create({ data });
  await audit(actorId, AuditAction.CREATE, item.id);
  return item;
};

const updateSemester = async (
  id: string,
  data: SemesterUpdateData,
  actorId: string,
) => {
  await getSingleSemesterByAdmin(id);
  const item = await prisma.programSemester.update({ where: { id }, data });
  await audit(actorId, AuditAction.UPDATE, id);
  return item;
};

const removeSemester = async (id: string, _actorId: string) => {
  await getSingleSemesterByAdmin(id);
  throw new AppError(
    httpStatus.CONFLICT,
    "Program semester slots are fixed by degree type and cannot be deleted",
  );
};

export const SemesterService = {
  semesterList,
  getSingleSemester,
  semesterListByAdmin,
  getSingleSemesterByAdmin,
  createSemester,
  updateSemester,
  removeSemester,
};
