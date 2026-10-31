import httpStatus from "http-status";
import { StudentSemesterStatus } from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";

type AssistantAction = { label: string; href: string };
type Recommendation = {
  title: string;
  description: string;
  href: string;
  category: "PROGRESSION" | "COURSEWORK" | "CURRICULUM";
};

const getStudentContext = async (userId: string) => {
  const profile = await prisma.studentProfile.findFirst({
    where: { userId, deletedAt: null },
    select: {
      id: true,
      programId: true,
      program: {
        select: {
          id: true,
          name: true,
          code: true,
          programSemesters: {
            where: { deletedAt: null },
            orderBy: { semesterNumber: "asc" },
            select: {
              id: true,
              name: true,
              semesterNumber: true,
              semesterCourses: {
                where: { deletedAt: null },
                select: {
                  course: { select: { title: true, courseCode: true } },
                },
              },
            },
          },
        },
      },
      semesterEnrollments: {
        where: { deletedAt: null },
        orderBy: { programSemester: { semesterNumber: "asc" } },
        select: {
          status: true,
          programSemester: {
            select: { id: true, name: true, semesterNumber: true },
          },
          courseEnrollments: {
            where: { deletedAt: null },
            select: {
              status: true,
              semesterCourse: {
                select: { course: { select: { title: true, courseCode: true } } },
              },
            },
          },
        },
      },
    },
  });
  if (!profile) {
    throw new AppError(httpStatus.NOT_FOUND, "Student profile not found");
  }
  return profile;
};

const getRecommendations = async (userId: string) => {
  const student = await getStudentContext(userId);
  const recommendations: Recommendation[] = [];

  if (!student.program) {
    return {
      recommendations: [
        {
          title: "Choose your academic program",
          description:
            "Select an active program to unlock its curriculum, admission fee details, and semester sequence.",
          href: "/student/academics",
          category: "PROGRESSION" as const,
        },
      ],
    };
  }

  const activeEnrollment = student.semesterEnrollments.find(
    (enrollment) => enrollment.status === StudentSemesterStatus.IN_PROGRESS,
  );
  if (activeEnrollment) {
    const incompleteCourses = activeEnrollment.courseEnrollments
      .filter((enrollment) => enrollment.status === "ENROLLED")
      .map((enrollment) => enrollment.semesterCourse.course);
    recommendations.push({
      title: `Continue ${activeEnrollment.programSemester.name}`,
      description: incompleteCourses.length
        ? `Keep up with your enrolled courses: ${incompleteCourses
            .slice(0, 3)
            .map((course) => `${course.courseCode} ${course.title}`)
            .join(", ")}.`
        : "Review your semester activity and check for upcoming classes, attendance, and exams.",
      href: "/student/workspace/enrollments",
      category: "COURSEWORK",
    });
  } else {
    const nextSemester = student.program.programSemesters.find((semester) => {
      const enrollment = student.semesterEnrollments.find(
        (item) => item.programSemester.id === semester.id,
      );
      return !enrollment || enrollment.status === StudentSemesterStatus.NOT_STARTED;
    });

    if (nextSemester) {
      const previousSemester = student.program.programSemesters.find(
        (semester) => semester.semesterNumber === nextSemester.semesterNumber - 1,
      );
      const previousEnrollment = previousSemester
        ? student.semesterEnrollments.find(
            (item) => item.programSemester.id === previousSemester.id,
          )
        : undefined;
      const canStart =
        nextSemester.semesterNumber === 1 ||
        previousEnrollment?.status === StudentSemesterStatus.COMPLETED;

      if (canStart) {
        const courses = nextSemester.semesterCourses.map(
          (placement) => placement.course,
        );
        recommendations.push({
          title: `Prepare for ${nextSemester.name}`,
          description:
            nextSemester.semesterNumber === 1
              ? "Review the admission fee and course list before starting your first semester."
              : "Your previous semester is complete. Review the course list and semester fee before enrolling.",
          href: `/student/academics/semester/${nextSemester.id}`,
          category: "PROGRESSION",
        });
        if (courses.length) {
          recommendations.push({
            title: "Preview your upcoming courses",
            description: courses
              .slice(0, 3)
              .map((course) => `${course.courseCode} ${course.title}`)
              .join(", "),
            href: `/student/academics/semester/${nextSemester.id}`,
            category: "COURSEWORK",
          });
        }
      } else if (previousEnrollment?.status === StudentSemesterStatus.FAILED) {
        recommendations.push({
          title: "Review your previous semester",
          description:
            "Check your published results and contact your academic office about the next steps before continuing.",
          href: "/student/workspace/results",
          category: "PROGRESSION",
        });
      } else {
        recommendations.push({
          title: `Your next semester is locked`,
          description:
            "Complete the previous semester to unlock the next step in your program.",
          href: "/student/academics",
          category: "PROGRESSION",
        });
      }
    } else {
      recommendations.push({
        title: "Review your academic progress",
        description:
          "You have no remaining semester to start. Review your transcript and completed results.",
        href: "/student/workspace/transcript",
        category: "CURRICULUM",
      });
    }
  }

  recommendations.push({
    title: "Check your academic record",
    description:
      "Review attendance, published results, and course updates regularly to stay on track.",
    href: "/student/workspace/attendance",
    category: "COURSEWORK",
  });

  return { recommendations: recommendations.slice(0, 3) };
};

const intents = [
  {
    name: "payments",
    keywords: ["fee", "fees", "payment", "pay", "invoice", "bkash", "stripe"],
    answer:
      "You can review admission and semester charges on the related program or semester detail page. Open an unpaid invoice there and choose an available payment method. A semester becomes active after its required payment is confirmed.",
    actions: [
      { label: "View program and semester fees", href: "/student/academics" },
      { label: "Open invoices", href: "/student/workspace/invoices" },
    ],
  },
  {
    name: "enrollment",
    keywords: ["enroll", "enrollment", "semester", "locked", "progression", "next"],
    answer:
      "Semesters must be taken in order. Semester 1 requires the admission fee and semester fee; each later semester unlocks after the previous semester is completed. Open your academic roadmap to see the current status and next action.",
    actions: [{ label: "View academic roadmap", href: "/student/academics" }],
  },
  {
    name: "curriculum",
    keywords: ["program", "curriculum", "course", "courses", "credit", "teacher"],
    answer:
      "Your program page shows its semester sequence and assigned courses. Open a semester to see course details, credits, and the assigned teacher.",
    actions: [{ label: "Open my curriculum", href: "/student/academics" }],
  },
  {
    name: "attendance",
    keywords: ["attendance", "present", "absent", "class"],
    answer:
      "Attendance is recorded by faculty and is read-only for students. Open your attendance workspace to review class dates and course records.",
    actions: [{ label: "View attendance", href: "/student/workspace/attendance" }],
  },
  {
    name: "exams",
    keywords: ["exam", "exams", "result", "results", "grade", "gpa", "transcript"],
    answer:
      "Faculty publish exam results after grading. You can review published results and your official academic history from the student workspace.",
    actions: [
      { label: "View results", href: "/student/workspace/results" },
      { label: "View transcript", href: "/student/workspace/transcript" },
    ],
  },
  {
    name: "profile",
    keywords: ["profile", "application", "admission", "account"],
    answer:
      "Your student profile and account settings are available from the dashboard. For a role application or admission-status question, contact the university administrator.",
    actions: [
      { label: "Open student profile", href: "/student/profile" },
      { label: "Open dashboard", href: "/student/dashboard" },
    ],
  },
];

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);

const chat = async (userId: string, message: string) => {
  const tokens = new Set(normalize(message));
  const intent = intents
    .map((candidate) => ({
      candidate,
      score: candidate.keywords.reduce(
        (score, keyword) => score + (tokens.has(keyword) ? 1 : 0),
        0,
      ),
    }))
    .sort((left, right) => right.score - left.score)[0];

  if (intent && intent.score > 0) {
    return {
      answer: intent.candidate.answer,
      actions: intent.candidate.actions,
      suggestedQuestions: [
        "What should I do next in my program?",
        "How do I check my academic progress?",
      ],
    };
  }

  if (tokens.has("hi") || tokens.has("hello") || tokens.has("help")) {
    return {
      answer:
        "Hello! I can help with semester enrollment, fees, curriculum, attendance, exams, results, and your profile. Choose a quick question or ask in your own words.",
      actions: [{ label: "View academic roadmap", href: "/student/academics" }],
      suggestedQuestions: [
        "How do I enroll in the next semester?",
        "Where can I see my results?",
        "How do I pay my semester fee?",
      ],
    };
  }

  const student = await getStudentContext(userId);
  const activeEnrollment = student.semesterEnrollments.find(
    (enrollment) => enrollment.status === StudentSemesterStatus.IN_PROGRESS,
  );
  const answer = !student.program
    ? "Your student profile does not have a program selected yet. Choose an active program to view its curriculum and semester steps."
    : activeEnrollment
      ? `You are currently progressing through ${activeEnrollment.programSemester.name} in ${student.program.name}. Check the student workspace for course activity, attendance, exams, and published results.`
      : `Your current program is ${student.program.name}. Open the academic roadmap to review semester completion and find your next eligible step.`;

  return {
    answer,
    actions: [{ label: "View academic roadmap", href: "/student/academics" }],
    suggestedQuestions: [
      "How do semester payments work?",
      "Where can I view attendance?",
      "How do I see my transcript?",
    ],
  };
};

export const AssistantService = { chat, getRecommendations };
