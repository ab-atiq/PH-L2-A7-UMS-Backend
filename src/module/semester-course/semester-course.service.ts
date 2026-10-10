import httpStatus from "http-status";
import { AuditAction, EntityStatus } from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";

const detailInclude = {
  course: true,
  programSemester: { include: { program: true } },
  teacher: {
    include: {
      user: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
    },
  },
} as const;

const list = async (programSemesterId: string) => {
  const semester = await prisma.programSemester.findFirst({
    where: { id: programSemesterId, deletedAt: null },
    select: { id: true },
  });
  if (!semester)
    throw new AppError(httpStatus.NOT_FOUND, "Program semester not found");
  return prisma.semesterCourse.findMany({
    where: { programSemesterId, deletedAt: null },
    include: detailInclude,
    orderBy: { course: { courseCode: "asc" } },
  });
};

const myCourses = async (userId: string) => {
  const faculty = await prisma.facultyProfile.findFirst({
    where: { userId, deletedAt: null },
    select: { id: true },
  });
  if (!faculty)
    throw new AppError(httpStatus.NOT_FOUND, "Faculty profile not found");
  return prisma.semesterCourse.findMany({
    where: {
      teacherId: faculty.id,
      deletedAt: null,
      status: EntityStatus.ACTIVE,
    },
    include: {
      ...detailInclude,
      courseEnrollments: {
        where: { deletedAt: null, status: "ENROLLED" },
        include: {
          student: {
            include: {
              user: {
                select: { firstName: true, lastName: true, email: true },
              },
            },
          },
        },
      },
    },
    orderBy: [
      { programSemester: { program: { name: "asc" } } },
      { programSemester: { semesterNumber: "asc" } },
      { course: { courseCode: "asc" } },
    ],
  });
};

const create = async (
  programSemesterId: string,
  data: { courseId: string; teacherId: string; status?: EntityStatus },
  actorId: string,
) => {
  const [semester, course, teacher] = await Promise.all([
    prisma.programSemester.findFirst({
      where: { id: programSemesterId, deletedAt: null },
      select: { id: true },
    }),
    prisma.course.findFirst({
      where: { id: data.courseId, deletedAt: null },
      select: { id: true },
    }),
    prisma.facultyProfile.findFirst({
      where: { id: data.teacherId, deletedAt: null },
      select: { id: true },
    }),
  ]);
  if (!semester)
    throw new AppError(httpStatus.NOT_FOUND, "Program semester not found");
  if (!course) throw new AppError(httpStatus.NOT_FOUND, "Course not found");
  if (!teacher)
    throw new AppError(httpStatus.NOT_FOUND, "Active faculty profile not found");
  const item = await prisma.semesterCourse.create({
    data: { programSemesterId, ...data },
    include: detailInclude,
  });
  await prisma.auditLog.create({
    data: {
      actorId,
      action: AuditAction.CREATE,
      entity: "SemesterCourse",
      entityId: item.id,
    },
  });
  return item;
};

const update = async (
  id: string,
  data: { courseId?: string; teacherId?: string; status?: EntityStatus },
  actorId: string,
) => {
  const current = await prisma.semesterCourse.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  });
  if (!current)
    throw new AppError(httpStatus.NOT_FOUND, "Semester course not found");
  if (data.courseId) {
    const course = await prisma.course.findFirst({
      where: { id: data.courseId, deletedAt: null },
      select: { id: true },
    });
    if (!course) throw new AppError(httpStatus.NOT_FOUND, "Course not found");
  }
  if (data.teacherId) {
    const teacher = await prisma.facultyProfile.findFirst({
      where: { id: data.teacherId, deletedAt: null },
      select: { id: true },
    });
    if (!teacher)
      throw new AppError(httpStatus.NOT_FOUND, "Active faculty profile not found");
  }
  const item = await prisma.semesterCourse.update({
    where: { id },
    data,
    include: detailInclude,
  });
  await prisma.auditLog.create({
    data: {
      actorId,
      action: AuditAction.UPDATE,
      entity: "SemesterCourse",
      entityId: item.id,
    },
  });
  return item;
};

const remove = async (id: string, actorId: string) => {
  const current = await prisma.semesterCourse.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  });
  if (!current)
    throw new AppError(httpStatus.NOT_FOUND, "Semester course not found");
  const enrollments = await prisma.courseEnrollment.count({
    where: { semesterCourseId: id, deletedAt: null },
  });
  if (enrollments)
    throw new AppError(
      httpStatus.CONFLICT,
      "A semester course with student enrollments cannot be removed",
    );
  const item = await prisma.semesterCourse.update({
    where: { id },
    data: { deletedAt: new Date(), status: EntityStatus.INACTIVE },
  });
  await prisma.auditLog.create({
    data: {
      actorId,
      action: AuditAction.DELETE,
      entity: "SemesterCourse",
      entityId: item.id,
    },
  });
  return item;
};

export const SemesterCourseService = { list, myCourses, create, update, remove };
