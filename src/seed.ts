/**
 * ==========================================================
 * University Management System — Database Seed Script
 * ==========================================================
 *
 * Populates every table in the redesigned schema with realistic,
 * interconnected demo data so the full project can be exercised
 * end-to-end (auth, curriculum, enrollment, attendance, exams,
 * results, GPA, transcripts, invoices, payments, notifications,
 * audit logs).
 *
 * ALIGNED WITH:
 * - prisma/schema/*.prisma (multi-file schema)
 * - schema_description.md
 * - working_flows.md
 * - University-Management-System.postman_collection.json
 *
 * KEY ARCHITECTURE HIGHLIGHTS:
 * - No Section and no SectionFaculty (replaced by SemesterCourse).
 * - Fixed Program Curriculum: Program -> ProgramSemester -> SemesterCourse.
 * - Progression gated by semester completion (SemesterEnrollment.status).
 * - Admission fee (InvoiceType.ADMISSION) + Per-semester fee (InvoiceType.SEMESTER).
 *
 * SEEDED DATA SUMMARY:
 * - 3 Departments: CSE, EEE, BBA
 * - 5 Programs: BSc-CSE (8 sem), BSc-EEE (8 sem), BBA-GEN (8 sem),
 *               MSc-CSE (4 sem), PhD-CSE (6 sem)
 * - 34 ProgramSemester slots across the 5 programs
 * - 26 Courses placed across the 3 BSc programs (CSE has 2 doubled-up semesters)
 * - 1 Admin: admin@university.edu
 * - 5 Faculty: 2 CSE, 2 EEE, 1 BBA (assigned to SemesterCourses)
 * - 20 Students:
 *     * Admission fee paid in full
 *     * Semester 1 COMPLETED (exams graded & published, GPA calculated, tuition paid)
 *     * Semester 2 IN_PROGRESS (ongoing attendance, midterm scheduled/ungraded,
 *       mixed invoice states: 12 paid, 1 failed payment attempt, 7 pending)
 *     * 1 deliberately DROPPED course enrollment for edge-case testing
 *
 * CREDENTIALS:
 * All accounts use password: Passw0rd!123
 *
 * USAGE:
 *   npx prisma migrate dev
 *   npx ts-node prisma/seed.ts (or npx ts-node seed.ts)
 *
 * The script is idempotent — it wipes all rows in FK-safe order
 * before re-seeding.
 * ==========================================================
 */

import bcrypt from "bcryptjs";
import {
  AttendanceStatus,
  AuditAction,
  CourseStatus,
  DegreeType,
  EnrollmentStatus,
  EntityStatus,
  ExamStatus,
  ExamType,
  Gender,
  Grade,
  InvoiceStatus,
  InvoiceType,
  NotificationType,
  PaymentGateway,
  PaymentStatus,
  ResultStatus,
  Role,
  StudentSemesterStatus,
  UserStatus,
} from "../generated/prisma/client.js";
import config from "./config/index.js";
import { prisma } from "./lib/prisma.js";

// Password & Hashing Configuration
const DEFAULT_PASSWORD = config.seed_default_password;
const SALT_ROUNDS = Number(config.bcrypt_salt_rounds) || 10;

const ADMIN_EMAIL = config.admin_email;
const ADMIN_NAME = config.admin_name;

// ----------------------------------------------------------
// Helpers
// ----------------------------------------------------------

function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[] | T[]): T {
  return arr[randomInt(0, arr.length - 1)]!;
}

function slug(first: string, last: string): string {
  return `${first}.${last}`.toLowerCase().replace(/\s+/g, "");
}

/** Converts a 0–100 total mark to letter grade and grade points */
function gradeFromPercentage(pct: number): { grade: Grade; point: number } {
  if (pct >= 90) return { grade: Grade.A_PLUS, point: 4.0 };
  if (pct >= 85) return { grade: Grade.A, point: 3.75 };
  if (pct >= 80) return { grade: Grade.A_MINUS, point: 3.5 };
  if (pct >= 75) return { grade: Grade.B_PLUS, point: 3.25 };
  if (pct >= 70) return { grade: Grade.B, point: 3.0 };
  if (pct >= 65) return { grade: Grade.B_MINUS, point: 2.75 };
  if (pct >= 60) return { grade: Grade.C_PLUS, point: 2.5 };
  if (pct >= 55) return { grade: Grade.C, point: 2.25 };
  if (pct >= 50) return { grade: Grade.C_MINUS, point: 2.0 };
  if (pct >= 45) return { grade: Grade.D, point: 1.0 };
  return { grade: Grade.F, point: 0.0 };
}

// ----------------------------------------------------------
// Static Reference Data
// ----------------------------------------------------------

const DEPARTMENTS = [
  { code: "CSE", name: "Computer Science & Engineering" },
  { code: "EEE", name: "Electrical & Electronic Engineering" },
  { code: "BBA", name: "Business Administration" },
] as const;

const PROGRAMS = [
  {
    code: "BSC-CSE",
    name: "B.Sc. in Computer Science & Engineering",
    deptCode: "CSE",
    degreeType: DegreeType.BSC,
    totalSemesters: 8,
    durationYears: 4,
    totalCredits: 140,
    admissionFee: 5000,
    semesterFee: 50000,
  },
  {
    code: "BSC-EEE",
    name: "B.Sc. in Electrical & Electronic Engineering",
    deptCode: "EEE",
    degreeType: DegreeType.BSC,
    totalSemesters: 8,
    durationYears: 4,
    totalCredits: 136,
    admissionFee: 4000,
    semesterFee: 50000,
  },
  {
    code: "BBA-GEN",
    name: "Bachelor of Business Administration",
    deptCode: "BBA",
    degreeType: DegreeType.BSC,
    totalSemesters: 8,
    durationYears: 4,
    totalCredits: 124,
    admissionFee: 4000,
    semesterFee: 50000,
  },
  {
    code: "MSC-CSE",
    name: "M.Sc. in Computer Science & Engineering",
    deptCode: "CSE",
    degreeType: DegreeType.MSC,
    totalSemesters: 4,
    durationYears: 2,
    totalCredits: 36,
    admissionFee: 6000,
    semesterFee: 50000,
  },
  {
    code: "PHD-CSE",
    name: "Ph.D. in Computer Science & Engineering",
    deptCode: "CSE",
    degreeType: DegreeType.PHD,
    totalSemesters: 6,
    durationYears: 3,
    totalCredits: 54,
    admissionFee: 8000,
    semesterFee: 50000,
  },
] as const;

// 26 Courses across the BSc programs
const COURSES = [
  // CSE Courses (10 total: 2 doubled-up semesters in Sem 1 and Sem 2)
  {
    code: "CSE101",
    title: "Introduction to Programming",
    credits: 3,
    deptCode: "CSE",
  },
  {
    code: "CSE102",
    title: "Structured Programming",
    credits: 3,
    deptCode: "CSE",
  },
  { code: "CSE201", title: "Data Structures", credits: 3, deptCode: "CSE" },
  {
    code: "CSE203",
    title: "Discrete Mathematics",
    credits: 3,
    deptCode: "CSE",
  },
  { code: "CSE202", title: "Algorithms", credits: 3, deptCode: "CSE" },
  {
    code: "CSE204",
    title: "Digital Logic Design",
    credits: 3,
    deptCode: "CSE",
  },
  { code: "CSE301", title: "Database Systems", credits: 3, deptCode: "CSE" },
  { code: "CSE302", title: "Operating Systems", credits: 3, deptCode: "CSE" },
  { code: "CSE303", title: "Computer Networks", credits: 3, deptCode: "CSE" },
  {
    code: "CSE401",
    title: "Software Engineering",
    credits: 3,
    deptCode: "CSE",
  },

  // EEE Courses (8 total: 1 per semester across 8 semesters)
  { code: "EEE101", title: "Circuit Analysis I", credits: 3, deptCode: "EEE" },
  { code: "EEE102", title: "Circuit Analysis II", credits: 3, deptCode: "EEE" },
  { code: "EEE201", title: "Electronics I", credits: 3, deptCode: "EEE" },
  { code: "EEE202", title: "Digital Electronics", credits: 3, deptCode: "EEE" },
  {
    code: "EEE301",
    title: "Electrical Machines I",
    credits: 3,
    deptCode: "EEE",
  },
  { code: "EEE302", title: "Power Systems", credits: 3, deptCode: "EEE" },
  { code: "EEE401", title: "Control Systems", credits: 3, deptCode: "EEE" },
  {
    code: "EEE402",
    title: "Telecommunication Engineering",
    credits: 3,
    deptCode: "EEE",
  },

  // BBA Courses (8 total: 1 per semester across 8 semesters)
  {
    code: "BBA101",
    title: "Principles of Management",
    credits: 3,
    deptCode: "BBA",
  },
  {
    code: "BBA102",
    title: "Financial Accounting",
    credits: 3,
    deptCode: "BBA",
  },
  {
    code: "BBA201",
    title: "Marketing Management",
    credits: 3,
    deptCode: "BBA",
  },
  { code: "BBA202", title: "Business Statistics", credits: 3, deptCode: "BBA" },
  { code: "BBA301", title: "Corporate Finance", credits: 3, deptCode: "BBA" },
  {
    code: "BBA302",
    title: "Human Resource Management",
    credits: 3,
    deptCode: "BBA",
  },
  {
    code: "BBA401",
    title: "Strategic Management",
    credits: 3,
    deptCode: "BBA",
  },
  {
    code: "BBA402",
    title: "International Business",
    credits: 3,
    deptCode: "BBA",
  },
] as const;

// Curriculum mapping: Program Code -> Semester Number -> Array of { courseCode, teacherEmpId }
const CURRICULUM_DISTRIBUTION: Record<
  string,
  Record<number, { courseCode: string; teacherEmpId: string }[]>
> = {
  "BSC-CSE": {
    1: [
      { courseCode: "CSE101", teacherEmpId: "EMP001" },
      { courseCode: "CSE102", teacherEmpId: "EMP002" },
    ],
    2: [
      { courseCode: "CSE201", teacherEmpId: "EMP001" },
      { courseCode: "CSE203", teacherEmpId: "EMP002" },
    ],
    3: [{ courseCode: "CSE202", teacherEmpId: "EMP001" }],
    4: [{ courseCode: "CSE204", teacherEmpId: "EMP002" }],
    5: [{ courseCode: "CSE301", teacherEmpId: "EMP001" }],
    6: [{ courseCode: "CSE302", teacherEmpId: "EMP002" }],
    7: [{ courseCode: "CSE303", teacherEmpId: "EMP001" }],
    8: [{ courseCode: "CSE401", teacherEmpId: "EMP002" }],
  },
  "BSC-EEE": {
    1: [{ courseCode: "EEE101", teacherEmpId: "EMP003" }],
    2: [{ courseCode: "EEE102", teacherEmpId: "EMP004" }],
    3: [{ courseCode: "EEE201", teacherEmpId: "EMP003" }],
    4: [{ courseCode: "EEE202", teacherEmpId: "EMP004" }],
    5: [{ courseCode: "EEE301", teacherEmpId: "EMP003" }],
    6: [{ courseCode: "EEE302", teacherEmpId: "EMP004" }],
    7: [{ courseCode: "EEE401", teacherEmpId: "EMP003" }],
    8: [{ courseCode: "EEE402", teacherEmpId: "EMP004" }],
  },
  "BBA-GEN": {
    1: [{ courseCode: "BBA101", teacherEmpId: "EMP005" }],
    2: [{ courseCode: "BBA102", teacherEmpId: "EMP005" }],
    3: [{ courseCode: "BBA201", teacherEmpId: "EMP005" }],
    4: [{ courseCode: "BBA202", teacherEmpId: "EMP005" }],
    5: [{ courseCode: "BBA301", teacherEmpId: "EMP005" }],
    6: [{ courseCode: "BBA302", teacherEmpId: "EMP005" }],
    7: [{ courseCode: "BBA401", teacherEmpId: "EMP005" }],
    8: [{ courseCode: "BBA402", teacherEmpId: "EMP005" }],
  },
};

const FACULTY = [
  {
    empId: "EMP001",
    first: "Rahim",
    last: "Uddin",
    deptCode: "CSE",
    designation: "Associate Professor",
    specialization: "Software Architecture & Algorithms",
  },
  {
    empId: "EMP002",
    first: "Fatema",
    last: "Khatun",
    deptCode: "CSE",
    designation: "Assistant Professor",
    specialization: "Data Systems & Machine Intelligence",
  },
  {
    empId: "EMP003",
    first: "Kamal",
    last: "Hossain",
    deptCode: "EEE",
    designation: "Professor",
    specialization: "Power Systems & Energy",
  },
  {
    empId: "EMP004",
    first: "Nasrin",
    last: "Akter",
    deptCode: "EEE",
    designation: "Assistant Professor",
    specialization: "Electronics & Embedded Systems",
  },
  {
    empId: "EMP005",
    first: "Shahidul",
    last: "Islam",
    deptCode: "BBA",
    designation: "Associate Professor",
    specialization: "Strategic Finance & Organizational Management",
  },
] as const;

const STUDENT_NAMES = [
  ["Arif", "Rahman"],
  ["Nusrat", "Jahan"],
  ["Tanvir", "Ahmed"],
  ["Mehjabin", "Islam"],
  ["Sabbir", "Hossain"],
  ["Farzana", "Akter"],
  ["Rakibul", "Islam"],
  ["Shirin", "Sultana"],
  ["Imran", "Kabir"],
  ["Taslima", "Begum"],
  ["Mahfuz", "Alam"],
  ["Ruma", "Akter"],
  ["Zubayer", "Hasan"],
  ["Ayesha", "Siddiqua"],
  ["Shakil", "Ahmed"],
  ["Nasima", "Khatun"],
  ["Rafiul", "Islam"],
  ["Sumaiya", "Islam"],
  ["Delwar", "Hossain"],
  ["Rehana", "Parvin"],
] as const;

const STUDENT_PROGRAM_CYCLE = ["BSC-CSE", "BSC-EEE", "BBA-GEN"] as const;

// ----------------------------------------------------------
// Database Reset (FK-Safe Deletion Order)
// ----------------------------------------------------------

async function resetDatabase() {
  console.log("Cleaning existing database records (FK-safe order)...");
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.result.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.courseEnrollment.deleteMany();
  await prisma.feeInvoice.deleteMany();
  await prisma.semesterEnrollment.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.semesterCourse.deleteMany();
  await prisma.programSemester.deleteMany();
  await prisma.course.deleteMany();
  await prisma.program.deleteMany();
  await prisma.facultyProfile.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
  console.log("Database reset complete.");
}

// ----------------------------------------------------------
// Main Seed Function
// ----------------------------------------------------------

async function main() {
  const startTime = Date.now();
  await resetDatabase();

  const defaultPasswordHash = await hashPassword(DEFAULT_PASSWORD);

  let auditCount = 0;
  async function logAudit(
    actorId: string | null,
    action: AuditAction,
    entity: string,
    entityId?: string | null,
    metadata?: object,
  ) {
    await prisma.auditLog.create({
      data: {
        actorId,
        action,
        entity,
        entityId: entityId || null,
        metadata: metadata ? (metadata as any) : undefined,
      },
    });
    auditCount++;
  }

  // ==========================================================
  // 1. Academic Structure: Departments
  // ==========================================================
  console.log("\nSeeding Departments...");
  const deptMap: Record<string, { id: string; code: string; name: string }> =
    {};
  for (const d of DEPARTMENTS) {
    const dept = await prisma.department.create({
      data: {
        code: d.code,
        name: d.name,
        description: `Department of ${d.name}`,
        status: EntityStatus.ACTIVE,
      },
    });
    deptMap[d.code] = dept;
  }
  console.log(
    `Created ${Object.keys(deptMap).length} departments (CSE, EEE, BBA).`,
  );

  // ==========================================================
  // 2. Academic Structure: Programs & ProgramSemesters
  // ==========================================================
  console.log("\nSeeding Programs & ProgramSemester slots...");
  const programMap: Record<
    string,
    { id: string; code: string; admissionFee: number; semesterFee: number }
  > = {};
  const programSemestersMap: Record<
    string,
    Record<number, { id: string; semesterNumber: number }>
  > = {};

  let totalSemestersCreated = 0;

  for (const p of PROGRAMS) {
    const prog = await prisma.program.create({
      data: {
        code: p.code,
        name: p.name,
        departmentId: deptMap[p.deptCode]!.id,
        degreeType: p.degreeType,
        totalSemesters: p.totalSemesters,
        durationYears: p.durationYears,
        totalCredits: p.totalCredits,
        admissionFee: p.admissionFee,
        semesterFee: p.semesterFee,
        status: EntityStatus.ACTIVE,
      },
    });

    programMap[p.code] = {
      id: prog.id,
      code: prog.code,
      admissionFee: Number(p.admissionFee),
      semesterFee: Number(p.semesterFee),
    };

    programSemestersMap[p.code] = {};

    // Auto-generate ProgramSemester slots (BSC: 8, MSC: 4, PHD: 6)
    for (let sem = 1; sem <= p.totalSemesters; sem++) {
      const ps = await prisma.programSemester.create({
        data: {
          programId: prog.id,
          semesterNumber: sem,
          name: `Semester ${sem}`,
          status: EntityStatus.ACTIVE,
        },
      });
      programSemestersMap[p.code]![sem] = { id: ps.id, semesterNumber: sem };
      totalSemestersCreated++;
    }
  }
  console.log(
    `Created ${Object.keys(programMap).length} programs and ${totalSemestersCreated} ProgramSemester rows (8+8+8+4+6 = 34).`,
  );

  // ==========================================================
  // 3. Courses Catalog (26 courses)
  // ==========================================================
  console.log("\nSeeding Course Catalog (26 courses)...");
  const courseMap: Record<
    string,
    { id: string; courseCode: string; title: string; credits: number }
  > = {};
  for (const c of COURSES) {
    const course = await prisma.course.create({
      data: {
        courseCode: c.code,
        title: c.title,
        credits: c.credits,
        description: `${c.title} — Offered by Department of ${c.deptCode}.`,
        departmentId: deptMap[c.deptCode]!.id,
        status: CourseStatus.PUBLISHED,
      },
    });
    courseMap[c.code] = {
      id: course.id,
      courseCode: course.courseCode,
      title: course.title,
      credits: course.credits,
    };
  }
  console.log(`Created ${Object.keys(courseMap).length} courses.`);

  // ==========================================================
  // 4. Admin Account
  // ==========================================================
  console.log("\nSeeding Admin Account...");
  const adminUser = await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      passwordHash: defaultPasswordHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      firstName: ADMIN_NAME.split(" ")[0] || "System",
      lastName: ADMIN_NAME.split(" ")[1] || "Admin",
      emailVerified: true,
      lastLoginAt: new Date(),
    },
  });
  await logAudit(adminUser.id, AuditAction.LOGIN, "User", adminUser.id, {
    source: "seed",
  });
  console.log(`Created Admin user: ${adminUser.email}`);

  // ==========================================================
  // 5. Faculty Accounts & Curriculum Placements (SemesterCourse)
  // ==========================================================
  console.log("\nSeeding Faculty & assigning SemesterCourse curriculum...");
  const facultyMap: Record<
    string,
    { userId: string; profileId: string; empId: string }
  > = {};

  for (const f of FACULTY) {
    const email = `${slug(f.first, f.last)}@university.edu`;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: defaultPasswordHash,
        role: Role.FACULTY,
        status: UserStatus.ACTIVE,
        firstName: f.first,
        lastName: f.last,
        emailVerified: true,
        lastLoginAt: new Date(),
      },
    });

    const profile = await prisma.facultyProfile.create({
      data: {
        userId: user.id,
        employeeId: f.empId,
        departmentId: deptMap[f.deptCode]!.id,
        designation: f.designation,
        specialization: f.specialization,
        joinDate: new Date("2020-01-15"),
      },
    });

    facultyMap[f.empId] = {
      userId: user.id,
      profileId: profile.id,
      empId: f.empId,
    };

    await logAudit(user.id, AuditAction.LOGIN, "User", user.id, {
      source: "seed",
    });
  }
  console.log(`Created ${Object.keys(facultyMap).length} faculty accounts.`);

  // Place courses into curriculum via SemesterCourse
  // Key: `${progCode}_S${semNum}_${courseCode}` -> SemesterCourse record
  const semesterCourseMap: Record<
    string,
    {
      id: string;
      programCode: string;
      semesterNumber: number;
      courseCode: string;
      teacherId: string;
    }
  > = {};

  let semesterCoursesCount = 0;
  for (const [progCode, semesters] of Object.entries(CURRICULUM_DISTRIBUTION)) {
    for (const [semNumStr, coursePlacements] of Object.entries(semesters)) {
      const semNum = Number(semNumStr);
      const programSemester = programSemestersMap[progCode]![semNum]!;

      for (const placement of coursePlacements) {
        const course = courseMap[placement.courseCode]!;
        const faculty = facultyMap[placement.teacherEmpId]!;

        const semCourse = await prisma.semesterCourse.create({
          data: {
            programSemesterId: programSemester.id,
            courseId: course.id,
            teacherId: faculty.profileId,
            status: EntityStatus.ACTIVE,
          },
        });

        const key = `${progCode}_S${semNum}_${placement.courseCode}`;
        semesterCourseMap[key] = {
          id: semCourse.id,
          programCode: progCode,
          semesterNumber: semNum,
          courseCode: placement.courseCode,
          teacherId: faculty.profileId,
        };
        semesterCoursesCount++;

        // Notify faculty about assigned curriculum slot
        await prisma.notification.create({
          data: {
            userId: faculty.userId,
            type: NotificationType.ACADEMIC,
            title: "Curriculum Course Assigned",
            message: `You are assigned to teach ${course.courseCode} (${course.title}) in ${progCode} Semester ${semNum}.`,
          },
        });

        await logAudit(
          adminUser.id,
          AuditAction.ASSIGN_TEACHER,
          "SemesterCourse",
          semCourse.id,
          {
            program: progCode,
            semester: semNum,
            course: course.courseCode,
            teacher: placement.teacherEmpId,
          },
        );
      }
    }
  }
  console.log(
    `Placed ${semesterCoursesCount} SemesterCourse records with assigned teachers.`,
  );

  // ==========================================================
  // 6. Pre-create Exams for Semester 1 & Semester 2 Courses
  // ==========================================================
  console.log(
    "\nSetting up Exams for Semester 1 (completed) and Semester 2 (ongoing)...",
  );

  // sem1ExamsMap[semCourseKey] = { midterm: Exam, final: Exam }
  const sem1ExamsMap: Record<
    string,
    { midterm: { id: string }; final: { id: string } }
  > = {};
  // sem2ExamsMap[semCourseKey] = { midterm: Exam, final: Exam }
  const sem2ExamsMap: Record<
    string,
    { midterm: { id: string }; final: { id: string } }
  > = {};

  let examCount = 0;

  for (const [key, sc] of Object.entries(semesterCourseMap)) {
    const course = courseMap[sc.courseCode]!;

    if (sc.semesterNumber === 1) {
      // Semester 1: Both Midterm and Final completed
      const midterm = await prisma.exam.create({
        data: {
          semesterCourseId: sc.id,
          examType: ExamType.MIDTERM,
          title: `${course.courseCode} Midterm Examination`,
          examDate: new Date("2026-03-05"),
          totalMarks: 30,
          weightage: 40,
          status: ExamStatus.COMPLETED,
        },
      });

      const final = await prisma.exam.create({
        data: {
          semesterCourseId: sc.id,
          examType: ExamType.FINAL,
          title: `${course.courseCode} Final Examination`,
          examDate: new Date("2026-05-15"),
          totalMarks: 70,
          weightage: 60,
          status: ExamStatus.COMPLETED,
        },
      });

      sem1ExamsMap[key] = { midterm, final };
      examCount += 2;
    } else if (sc.semesterNumber === 2) {
      // Semester 2: Midterm scheduled/published (ungraded), Final draft
      const midterm = await prisma.exam.create({
        data: {
          semesterCourseId: sc.id,
          examType: ExamType.MIDTERM,
          title: `${course.courseCode} Midterm Examination`,
          examDate: new Date("2026-10-25"),
          totalMarks: 30,
          weightage: 40,
          status: ExamStatus.PUBLISHED,
        },
      });

      const final = await prisma.exam.create({
        data: {
          semesterCourseId: sc.id,
          examType: ExamType.FINAL,
          title: `${course.courseCode} Final Examination`,
          examDate: new Date("2026-12-15"),
          totalMarks: 70,
          weightage: 60,
          status: ExamStatus.DRAFT,
        },
      });

      sem2ExamsMap[key] = { midterm, final };
      examCount += 2;
    }
  }
  console.log(`Created ${examCount} exams across Semesters 1 and 2.`);

  // ==========================================================
  // 7. Seed Students & Full Lifecycle Flows
  // ==========================================================
  console.log(
    "\nSeeding 20 Students with Admission, Semester 1 (completed), and Semester 2 (in progress)...",
  );

  let invoiceCounter = 1;
  let paymentCounter = 1;

  let semEnrollmentCount = 0;
  let courseEnrollmentCount = 0;
  let attendanceCount = 0;
  let resultCount = 0;
  let invoiceCount = 0;
  let paymentCount = 0;

  for (let i = 0; i < STUDENT_NAMES.length; i++) {
    const [first, last] = STUDENT_NAMES[i]!;
    const progCode = STUDENT_PROGRAM_CYCLE[i % STUDENT_PROGRAM_CYCLE.length]!;
    const program = programMap[progCode]!;
    const deptCode = PROGRAMS.find((p) => p.code === progCode)!.deptCode;
    const department = deptMap[deptCode]!;
    const studentId = `STU2026${String(i + 1).padStart(3, "0")}`;
    const email = `${slug(first, last)}@student.university.edu`;

    // 7.1 User Account
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: defaultPasswordHash,
        role: Role.STUDENT,
        status: UserStatus.ACTIVE,
        firstName: first,
        lastName: last,
        phone: `+88017${String(randomInt(10000000, 99999999))}`,
        emailVerified: true,
        lastLoginAt: new Date("2026-09-01"),
      },
    });

    // 7.2 StudentProfile (points to currentProgramSemester = Semester 2)
    const sem2ProgramSemester = programSemestersMap[progCode]![2]!;
    const profile = await prisma.studentProfile.create({
      data: {
        userId: user.id,
        studentId,
        programId: program.id,
        departmentId: department.id,
        currentProgramSemesterId: sem2ProgramSemester.id,
        batchYear: 2026,
        gender: i % 2 === 0 ? Gender.MALE : Gender.FEMALE,
        dateOfBirth: new Date(2003, i % 12, (i % 25) + 1),
        address: `House ${12 + i}, Road ${1 + (i % 7)}, Rajshahi, Bangladesh`,
        guardianName: `Guardian of ${first} ${last}`,
        guardianPhone: `+88018${String(randomInt(10000000, 99999999))}`,
        admissionDate: new Date("2026-01-05"),
      },
    });

    // Welcome Notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: NotificationType.INFO,
        title: "Welcome to University Portal",
        message: `Welcome ${first}! Your student profile (${studentId}) has been registered for ${progCode}.`,
      },
    });

    // --------------------------------------------------------
    // 7.3 Admission Fee (One-Time: InvoiceType.ADMISSION)
    // --------------------------------------------------------
    const admInvoiceNumber = `INV-ADM-${String(invoiceCounter++).padStart(4, "0")}`;
    const admInvoice = await prisma.feeInvoice.create({
      data: {
        invoiceNumber: admInvoiceNumber,
        studentId: profile.id,
        type: InvoiceType.ADMISSION,
        programId: program.id,
        description: `Admission Fee — ${progCode}`,
        amount: program.admissionFee,
        dueDate: new Date("2026-01-10"),
        status: InvoiceStatus.PAID,
      },
    });
    invoiceCount++;

    const admPayment = await prisma.payment.create({
      data: {
        transactionId: `TXN-ADM-${String(paymentCounter++).padStart(4, "0")}`,
        invoiceId: admInvoice.id,
        studentId: profile.id,
        amount: program.admissionFee,
        gateway: pick([
          PaymentGateway.STRIPE,
          PaymentGateway.BKASH,
          PaymentGateway.SSLCOMMERZ,
        ]),
        status: PaymentStatus.SUCCESS,
        gatewayReference: `ref_adm_${Math.random().toString(36).slice(2, 10)}`,
        paidAt: new Date("2026-01-07"),
      },
    });
    paymentCount++;

    await logAudit(
      user.id,
      AuditAction.UPDATE_PAYMENT_STATUS,
      "Payment",
      admPayment.id,
      {
        invoice: admInvoiceNumber,
        type: "ADMISSION",
        status: "SUCCESS",
      },
    );

    // --------------------------------------------------------
    // 7.4 Semester 1: FULLY COMPLETED (Graded, Published, Paid)
    // --------------------------------------------------------
    const sem1ProgramSemester = programSemestersMap[progCode]![1]!;

    const sem1Enrollment = await prisma.semesterEnrollment.create({
      data: {
        studentId: profile.id,
        programSemesterId: sem1ProgramSemester.id,
        status: StudentSemesterStatus.COMPLETED,
        enrolledAt: new Date("2026-01-10"),
        completedAt: new Date("2026-05-25"),
        semesterGpa: 0, // updated below once courses are graded
      },
    });
    semEnrollmentCount++;

    await logAudit(
      user.id,
      AuditAction.ENROLL,
      "SemesterEnrollment",
      sem1Enrollment.id,
      {
        semester: 1,
        program: progCode,
      },
    );

    // Semester 1 Fee Invoice & Payment
    const sem1InvoiceNumber = `INV-2026-S1-${String(invoiceCounter++).padStart(4, "0")}`;
    const sem1Invoice = await prisma.feeInvoice.create({
      data: {
        invoiceNumber: sem1InvoiceNumber,
        studentId: profile.id,
        type: InvoiceType.SEMESTER,
        semesterEnrollmentId: sem1Enrollment.id,
        description: `${progCode} Semester 1 Tuition Fee`,
        amount: program.semesterFee,
        dueDate: new Date("2026-01-20"),
        status: InvoiceStatus.PAID,
      },
    });
    invoiceCount++;

    const sem1Payment = await prisma.payment.create({
      data: {
        transactionId: `TXN-S1-${String(paymentCounter++).padStart(4, "0")}`,
        invoiceId: sem1Invoice.id,
        studentId: profile.id,
        amount: program.semesterFee,
        gateway: pick([
          PaymentGateway.BKASH,
          PaymentGateway.SSLCOMMERZ,
          PaymentGateway.STRIPE,
        ]),
        status: PaymentStatus.SUCCESS,
        gatewayReference: `ref_s1_${Math.random().toString(36).slice(2, 10)}`,
        paidAt: new Date("2026-01-15"),
      },
    });
    paymentCount++;

    await logAudit(
      user.id,
      AuditAction.UPDATE_PAYMENT_STATUS,
      "Payment",
      sem1Payment.id,
      {
        invoice: sem1InvoiceNumber,
        status: "SUCCESS",
      },
    );

    // Courses in Semester 1
    const sem1Courses = CURRICULUM_DISTRIBUTION[progCode]![1]!;
    let totalGradePoints = 0;

    for (const cInfo of sem1Courses) {
      const scKey = `${progCode}_S1_${cInfo.courseCode}`;
      const sc = semesterCourseMap[scKey]!;
      const exams = sem1ExamsMap[scKey]!;
      const faculty = facultyMap[cInfo.teacherEmpId]!;

      // Realistic high performance (mostly A/A-/B+)
      const midMarks = randomInt(20, 29); // out of 30
      const finalMarks = randomInt(50, 68); // out of 70
      const totalPct = midMarks + finalMarks;
      const { grade, point } = gradeFromPercentage(totalPct);
      totalGradePoints += point;

      const courseEnrollment = await prisma.courseEnrollment.create({
        data: {
          studentId: profile.id,
          semesterCourseId: sc.id,
          semesterEnrollmentId: sem1Enrollment.id,
          status: EnrollmentStatus.COMPLETED,
          enrolledAt: new Date("2026-01-10"),
          finalGrade: grade,
          gradePoint: point,
        },
      });
      courseEnrollmentCount++;

      // Attendance: 6 class sessions in Spring
      const classDates = [
        "2026-01-15",
        "2026-01-22",
        "2026-01-29",
        "2026-02-05",
        "2026-02-12",
        "2026-02-19",
      ];
      for (const d of classDates) {
        const attStatus =
          Math.random() < 0.85
            ? AttendanceStatus.PRESENT
            : pick([AttendanceStatus.LATE, AttendanceStatus.ABSENT]);

        await prisma.attendance.create({
          data: {
            courseEnrollmentId: courseEnrollment.id,
            studentId: profile.id,
            semesterCourseId: sc.id,
            classDate: new Date(d),
            status: attStatus,
            markedById: faculty.userId,
          },
        });
        attendanceCount++;
      }

      // Results: Midterm & Final (both published)
      await prisma.result.create({
        data: {
          examId: exams.midterm.id,
          studentId: profile.id,
          courseEnrollmentId: courseEnrollment.id,
          marksObtained: midMarks,
          status: ResultStatus.PUBLISHED,
          publishedAt: new Date("2026-03-12"),
          enteredById: faculty.userId,
        },
      });

      await prisma.result.create({
        data: {
          examId: exams.final.id,
          studentId: profile.id,
          courseEnrollmentId: courseEnrollment.id,
          marksObtained: finalMarks,
          grade,
          gradePoint: point,
          status: ResultStatus.PUBLISHED,
          publishedAt: new Date("2026-05-20"),
          enteredById: faculty.userId,
        },
      });
      resultCount += 2;

      await logAudit(
        faculty.userId,
        AuditAction.PUBLISH_RESULT,
        "Result",
        courseEnrollment.id,
        {
          course: cInfo.courseCode,
          grade,
          student: studentId,
        },
      );
    }

    // Update Semester 1 GPA
    const sem1Gpa = Number((totalGradePoints / sem1Courses.length).toFixed(2));
    await prisma.semesterEnrollment.update({
      where: { id: sem1Enrollment.id },
      data: { semesterGpa: sem1Gpa },
    });

    await prisma.notification.create({
      data: {
        userId: user.id,
        type: NotificationType.SUCCESS,
        title: "Semester 1 Completed",
        message: `Congratulations! You completed Semester 1 with GPA ${sem1Gpa}. Semester 2 is unlocked.`,
      },
    });

    // --------------------------------------------------------
    // 7.5 Semester 2: IN PROGRESS (Ongoing Attendance, Ungraded Midterm, Mixed Payments)
    // --------------------------------------------------------
    const sem2Enrollment = await prisma.semesterEnrollment.create({
      data: {
        studentId: profile.id,
        programSemesterId: sem2ProgramSemester.id,
        status: StudentSemesterStatus.IN_PROGRESS,
        enrolledAt: new Date("2026-08-20"),
      },
    });
    semEnrollmentCount++;

    await logAudit(
      user.id,
      AuditAction.ENROLL,
      "SemesterEnrollment",
      sem2Enrollment.id,
      {
        semester: 2,
        program: progCode,
      },
    );

    // Semester 2 Fee Invoice & Mixed Payment States:
    // - Students 0..11: PAID (12 students)
    // - Student 12: PENDING with 1 FAILED payment attempt (Taslima Begum)
    // - Students 13..19: PENDING (7 students)
    const isPaid = i < 12;
    const isFailedAttempt = i === 12;

    const sem2InvoiceNumber = `INV-2026-S2-${String(invoiceCounter++).padStart(4, "0")}`;
    const sem2Invoice = await prisma.feeInvoice.create({
      data: {
        invoiceNumber: sem2InvoiceNumber,
        studentId: profile.id,
        type: InvoiceType.SEMESTER,
        semesterEnrollmentId: sem2Enrollment.id,
        description: `${progCode} Semester 2 Tuition Fee`,
        amount: program.semesterFee,
        dueDate: new Date("2026-09-25"),
        status: isPaid ? InvoiceStatus.PAID : InvoiceStatus.PENDING,
      },
    });
    invoiceCount++;

    if (isPaid) {
      const sem2Payment = await prisma.payment.create({
        data: {
          transactionId: `TXN-S2-${String(paymentCounter++).padStart(4, "0")}`,
          invoiceId: sem2Invoice.id,
          studentId: profile.id,
          amount: program.semesterFee,
          gateway: pick([
            PaymentGateway.STRIPE,
            PaymentGateway.BKASH,
            PaymentGateway.SSLCOMMERZ,
          ]),
          status: PaymentStatus.SUCCESS,
          gatewayReference: `ref_s2_${Math.random().toString(36).slice(2, 10)}`,
          paidAt: new Date("2026-09-02"),
        },
      });
      paymentCount++;

      await logAudit(
        user.id,
        AuditAction.UPDATE_PAYMENT_STATUS,
        "Payment",
        sem2Payment.id,
        {
          invoice: sem2InvoiceNumber,
          status: "SUCCESS",
        },
      );

      await prisma.notification.create({
        data: {
          userId: user.id,
          type: NotificationType.PAYMENT,
          title: "Payment Received",
          message: `Your payment of ৳50,000 for invoice ${sem2InvoiceNumber} was received.`,
        },
      });
    } else if (isFailedAttempt) {
      const failedPayment = await prisma.payment.create({
        data: {
          transactionId: `TXN-S2-${String(paymentCounter++).padStart(4, "0")}`,
          invoiceId: sem2Invoice.id,
          studentId: profile.id,
          amount: program.semesterFee,
          gateway: PaymentGateway.SSLCOMMERZ,
          status: PaymentStatus.FAILED,
          gatewayReference: `ref_s2_fail_${Math.random().toString(36).slice(2, 10)}`,
        },
      });
      paymentCount++;

      await logAudit(
        user.id,
        AuditAction.UPDATE_PAYMENT_STATUS,
        "Payment",
        failedPayment.id,
        {
          invoice: sem2InvoiceNumber,
          status: "FAILED",
        },
      );

      await prisma.notification.create({
        data: {
          userId: user.id,
          type: NotificationType.ERROR,
          title: "Payment Failed",
          message: `Your payment attempt for invoice ${sem2InvoiceNumber} failed. Please retry before due date.`,
        },
      });
    } else {
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: NotificationType.WARNING,
          title: "Tuition Fee Due",
          message: `Invoice ${sem2InvoiceNumber} (৳50,000) for Semester 2 is due on 2026-09-25.`,
        },
      });
    }

    // Courses in Semester 2
    const sem2Courses = CURRICULUM_DISTRIBUTION[progCode]![2]!;

    for (let cIdx = 0; cIdx < sem2Courses.length; cIdx++) {
      const cInfo = sem2Courses[cIdx]!;
      const scKey = `${progCode}_S2_${cInfo.courseCode}`;
      const sc = semesterCourseMap[scKey]!;
      const faculty = facultyMap[cInfo.teacherEmpId]!;

      // Edge case: Exactly 1 deliberately DROPPED course enrollment across the entire system
      // Student 0 (Arif Rahman, BSC-CSE) drops their 2nd course (CSE203 Discrete Mathematics)
      const isDropped = i === 0 && cIdx === 1;

      const courseEnrollment = await prisma.courseEnrollment.create({
        data: {
          studentId: profile.id,
          semesterCourseId: sc.id,
          semesterEnrollmentId: sem2Enrollment.id,
          status: isDropped
            ? EnrollmentStatus.DROPPED
            : EnrollmentStatus.ENROLLED,
          enrolledAt: new Date("2026-08-20"),
          droppedAt: isDropped ? new Date("2026-09-08") : null,
        },
      });
      courseEnrollmentCount++;

      if (isDropped) {
        await logAudit(
          user.id,
          AuditAction.DROP_ENROLLMENT,
          "CourseEnrollment",
          courseEnrollment.id,
          {
            course: cInfo.courseCode,
            reason: "Student voluntarily dropped course",
          },
        );
        continue; // No ongoing attendance for dropped course
      }

      // Ongoing Attendance: 4 recent classes in September
      const ongoingDates = [
        "2026-09-03",
        "2026-09-10",
        "2026-09-17",
        "2026-09-24",
      ];
      for (const d of ongoingDates) {
        const attStatus =
          Math.random() < 0.9
            ? AttendanceStatus.PRESENT
            : AttendanceStatus.ABSENT;

        await prisma.attendance.create({
          data: {
            courseEnrollmentId: courseEnrollment.id,
            studentId: profile.id,
            semesterCourseId: sc.id,
            classDate: new Date(d),
            status: attStatus,
            markedById: faculty.userId,
          },
        });
        attendanceCount++;
      }
    }
  }
  console.log(
    `Successfully seeded all 20 students with complete academic histories and active semesters.`,
  );

  // ==========================================================
  // 8. Sample Active Refresh Token
  // ==========================================================
  console.log("\nSeeding sample session tokens...");
  await prisma.refreshToken.create({
    data: {
      userId: adminUser.id,
      tokenHash: `seed_refresh_admin_${Math.random().toString(36).slice(2, 16)}`,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      userAgent: "PostmanRuntime/7.43.0",
      ipAddress: "127.0.0.1",
    },
  });

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

  // ==========================================================
  // Summary Report
  // ==========================================================
  console.log("\n========================================================");
  console.log("       UNIVERSITY MANAGEMENT SYSTEM — SEED COMPLETE      ");
  console.log("========================================================");
  console.log(`Execution time: ${durationSec}s`);
  console.log("--------------------------------------------------------");
  console.log(
    `Departments         : ${Object.keys(deptMap).length} (CSE, EEE, BBA)`,
  );
  console.log(
    `Programs            : ${Object.keys(programMap).length} (BSc-CSE, BSc-EEE, BBA-GEN, MSc-CSE, PhD-CSE)`,
  );
  console.log(
    `ProgramSemesters    : ${totalSemestersCreated} (34 slots total)`,
  );
  console.log(
    `Courses             : ${Object.keys(courseMap).length} (26 catalog entries)`,
  );
  console.log(
    `SemesterCourses     : ${semesterCoursesCount} (curriculum slots with assigned teachers)`,
  );
  console.log(
    `Users               : 26 total (1 Admin, 5 Faculty, 20 Students)`,
  );
  console.log(
    `SemesterEnrollments : ${semEnrollmentCount} (20 completed S1 + 20 in-progress S2)`,
  );
  console.log(
    `CourseEnrollments   : ${courseEnrollmentCount} (includes 1 deliberately dropped course)`,
  );
  console.log(`Attendance Records  : ${attendanceCount}`);
  console.log(`Exams Created       : ${examCount}`);
  console.log(
    `Results Published   : ${resultCount} (Semester 1 exams graded & published)`,
  );
  console.log(
    `Invoices Created    : ${invoiceCount} (20 Admission + 20 Sem 1 + 20 Sem 2)`,
  );
  console.log(
    `Payments Recorded   : ${paymentCount} (40 S1/Admission paid + 12 S2 paid + 1 S2 failed)`,
  );
  console.log(`Audit Logs Recorded : ${auditCount}`);
  console.log("--------------------------------------------------------");
  console.log("DEMO ACCOUNTS (Password: Passw0rd!123 for all):");
  console.log(`  ADMIN   : ${adminUser.email}`);
  console.log("  FACULTY :");
  for (const f of FACULTY) {
    console.log(
      `    - ${f.empId} (${f.deptCode}): ${slug(f.first, f.last)}@university.edu`,
    );
  }
  console.log("  STUDENTS (20 total, cycled across BSc programs):");
  console.log(
    `    - arif.rahman@student.university.edu (BSc-CSE, has dropped CSE203 in S2)`,
  );
  console.log(`    - nusrat.jahan@student.university.edu (BSc-EEE)`);
  console.log(`    - tanvir.ahmed@student.university.edu (BBA-GEN)`);
  console.log(
    `    - taslima.begum@student.university.edu (BSc-CSE, failed S2 payment attempt)`,
  );
  console.log(
    `    - ...and 16 more (format: firstname.lastname@student.university.edu)`,
  );
  console.log("========================================================\n");
}

main()
  .catch((e) => {
    console.error("Seed execution failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
