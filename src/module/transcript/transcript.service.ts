import httpStatus from "http-status";
import { ResultStatus } from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";

const getMyTranscript = async (userId: string) => {
  const student = await prisma.studentProfile.findFirst({
    where: { userId, deletedAt: null },
    select: {
      id: true,
      studentId: true,
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  });
  if (!student)
    throw new AppError(httpStatus.NOT_FOUND, "Student profile not found");

  const results = await prisma.result.findMany({
    where: {
      studentId: student.id,
      status: ResultStatus.PUBLISHED,
      deletedAt: null,
    },
    select: {
      id: true,
      marksObtained: true,
      grade: true,
      gradePoint: true,
      publishedAt: true,
      exam: {
        select: {
          section: {
            select: {
              course: {
                select: {
                  id: true,
                  courseCode: true,
                  title: true,
                  credits: true,
                },
              },
              semester: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
    orderBy: { publishedAt: "asc" },
  });

  const semesterMap = new Map<
    string,
    {
      semesterId: string;
      semesterName: string;
      courses: typeof results;
    }
  >();

  for (const result of results) {
    const semester = result.exam.section.semester;
    const current = semesterMap.get(semester.id) ?? {
      semesterId: semester.id,
      semesterName: semester.name,
      courses: [],
    };
    current.courses.push(result);
    semesterMap.set(semester.id, current);
  }

  let cumulativeCredits = 0;
  let cumulativeQualityPoints = 0;
  const semesters = [...semesterMap.values()].map((semester) => {
    const attemptedCredits = semester.courses.reduce(
      (sum, result) => sum + result.exam.section.course.credits,
      0,
    );
    const qualityPoints = semester.courses.reduce(
      (sum, result) =>
        sum + result.exam.section.course.credits * (result.gradePoint ?? 0),
      0,
    );
    cumulativeCredits += attemptedCredits;
    cumulativeQualityPoints += qualityPoints;

    return {
      semesterId: semester.semesterId,
      semesterName: semester.semesterName,
      attemptedCredits,
      earnedCredits: semester.courses.reduce(
        (sum, result) =>
          sum + (result.grade === "F" ? 0 : result.exam.section.course.credits),
        0,
      ),
      gpa: attemptedCredits ? qualityPoints / attemptedCredits : 0,
      courses: semester.courses.map((result) => ({
        resultId: result.id,
        course: result.exam.section.course,
        marksObtained: result.marksObtained,
        grade: result.grade,
        gradePoint: result.gradePoint,
        publishedAt: result.publishedAt,
      })),
    };
  });

  return {
    student,
    semesters,
    cumulative: {
      attemptedCredits: cumulativeCredits,
      earnedCredits: semesters.reduce(
        (sum, semester) => sum + semester.earnedCredits,
        0,
      ),
      gpa: cumulativeCredits ? cumulativeQualityPoints / cumulativeCredits : 0,
    },
  };
};

export const TranscriptService = { getMyTranscript };
