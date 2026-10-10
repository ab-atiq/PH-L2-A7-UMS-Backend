import httpStatus from "http-status";
import { ExamType, ResultStatus } from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";

const getMyTranscript = async (userId: string) => {
  const student = await prisma.studentProfile.findFirst({
    where: { userId, deletedAt: null },
    select: {
      id: true,
      studentId: true,
      programId: true,
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  });
  if (!student)
    throw new AppError(httpStatus.NOT_FOUND, "Student profile not found");

  const publishedResults = await prisma.result.findMany({
    where: {
      studentId: student.id,
      status: ResultStatus.PUBLISHED,
      deletedAt: null,
    },
    select: {
      id: true,
      examId: true,
      marksObtained: true,
      grade: true,
      gradePoint: true,
      publishedAt: true,
      exam: {
        select: {
          examType: true,
          examDate: true,
          semesterCourseId: true,
          semesterCourse: {
            select: {
              course: {
                select: {
                  id: true,
                  courseCode: true,
                  title: true,
                  credits: true,
                },
              },
              programSemester: {
                select: { id: true, name: true, semesterNumber: true },
              },
            },
          },
        },
      },
    },
    orderBy: { publishedAt: "asc" },
  });

  const courseResults = new Map<string, (typeof publishedResults)[number]>();
  for (const result of publishedResults) {
    const previous = courseResults.get(result.exam.semesterCourseId);
    if (
      !previous ||
      result.exam.examType === ExamType.FINAL ||
      (previous.exam.examType !== ExamType.FINAL &&
        result.exam.examDate > previous.exam.examDate)
    ) {
      courseResults.set(result.exam.semesterCourseId, result);
    }
  }

  const semesterMap = new Map<
    string,
    {
      semesterId: string;
      semesterName: string;
      semesterNumber: number;
      courses: (typeof publishedResults)[number][];
    }
  >();
  for (const result of courseResults.values()) {
    const semester = result.exam.semesterCourse.programSemester;
    const current = semesterMap.get(semester.id) ?? {
      semesterId: semester.id,
      semesterName: semester.name,
      semesterNumber: semester.semesterNumber,
      courses: [],
    };
    current.courses.push(result);
    semesterMap.set(semester.id, current);
  }

  let cumulativeCredits = 0;
  let cumulativeQualityPoints = 0;
  const semesters = [...semesterMap.values()]
    .sort((left, right) => left.semesterNumber - right.semesterNumber)
    .map((semester) => {
      const attemptedCredits = semester.courses.reduce(
        (sum, result) =>
          sum + result.exam.semesterCourse.course.credits,
        0,
      );
      const qualityPoints = semester.courses.reduce(
        (sum, result) =>
          sum +
          result.exam.semesterCourse.course.credits * (result.gradePoint ?? 0),
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
            sum +
            (result.grade === "F"
              ? 0
              : result.exam.semesterCourse.course.credits),
          0,
        ),
        gpa: attemptedCredits ? qualityPoints / attemptedCredits : 0,
        courses: semester.courses.map((result) => ({
          resultId: result.id,
          course: result.exam.semesterCourse.course,
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
