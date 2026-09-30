/**
 * ==========================================================
 * University Management System — Database Seed Script
 * ==========================================================
 *
 * Populates every table in the schema with realistic,
 * interconnected demo data so the full project can be
 * exercised end-to-end (auth, enrollment, attendance,
 * exams, results, GPA, invoices, payments, notifications,
 * audit logs).
 *
 * USAGE
 * -----
 * 1. Make sure DATABASE_URL is set and migrations are applied:
 *      npx prisma migrate dev
 *
 * 2. Run this script:
 *      npx ts-node prisma/seed.ts
 *    or wire it up in package.json:
 *      "prisma": { "seed": "ts-node prisma/seed.ts" }
 *    then run:
 *      npx prisma db seed
 *
 * The script is idempotent — it wipes all rows (in FK-safe
 * order) before re-seeding, so it is safe to re-run.
 * ==========================================================
 */

import bcrypt from "bcryptjs";
import {
  AttendanceStatus,
  AuditAction,
  CourseStatus,
  EnrollmentStatus,
  EntityStatus,
  ExamStatus,
  ExamType,
  Gender,
  Grade,
  InvoiceStatus,
  NotificationType,
  PaymentGateway,
  PaymentStatus,
  ResultStatus,
  Role,
  SectionStatus,
  SemesterStatus,
  UserStatus,
} from "../generated/prisma/client.js";
import config from "./config/index.js";
import { prisma } from "./lib/prisma.js";

// use same prisma client in src/lib/prisma.ts and src/seed.ts to avoid multiple instances
// import { PrismaPg } from "@prisma/adapter-pg";
// import "dotenv/config";
// const connectionString = `${process.env.DATABASE_URL}`;
// const adapter = new PrismaPg({ connectionString });
// const prisma = new PrismaClient({ adapter });

const SALT_ROUNDS = Number(config.bcrypt_salt_rounds);

// ----------------------------------------------------------
// Small helpers
// ----------------------------------------------------------

function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)]!;
}

/** Marks are assumed to be on a 0–100 combined scale. */
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

function slug(first: string, last: string): string {
  return `${first}.${last}`.toLowerCase().replace(/\s+/g, "");
}

// ----------------------------------------------------------
// Static reference data
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
    durationYears: 4,
    totalCredits: 140,
  },
  {
    code: "BSC-EEE",
    name: "B.Sc. in Electrical & Electronic Engineering",
    deptCode: "EEE",
    durationYears: 4,
    totalCredits: 136,
  },
  {
    code: "BBA-GEN",
    name: "Bachelor of Business Administration",
    deptCode: "BBA",
    durationYears: 4,
    totalCredits: 124,
  },
] as const;

const COURSES = [
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
    prereq: "CSE101",
  },
  {
    code: "CSE201",
    title: "Data Structures",
    credits: 3,
    deptCode: "CSE",
    prereq: "CSE102",
  },
  {
    code: "CSE202",
    title: "Algorithms",
    credits: 3,
    deptCode: "CSE",
    prereq: "CSE201",
  },
  {
    code: "CSE203",
    title: "Discrete Mathematics",
    credits: 3,
    deptCode: "CSE",
  },
  {
    code: "CSE204",
    title: "Digital Logic Design",
    credits: 3,
    deptCode: "CSE",
  },
  {
    code: "CSE301",
    title: "Database Systems",
    credits: 3,
    deptCode: "CSE",
    prereq: "CSE201",
  },
  {
    code: "CSE302",
    title: "Operating Systems",
    credits: 3,
    deptCode: "CSE",
    prereq: "CSE201",
  },
  { code: "CSE303", title: "Computer Networks", credits: 3, deptCode: "CSE" },
  {
    code: "CSE401",
    title: "Software Engineering",
    credits: 3,
    deptCode: "CSE",
    prereq: "CSE301",
  },
  { code: "EEE101", title: "Circuit Analysis I", credits: 3, deptCode: "EEE" },
  {
    code: "EEE102",
    title: "Circuit Analysis II",
    credits: 3,
    deptCode: "EEE",
    prereq: "EEE101",
  },
  {
    code: "EEE201",
    title: "Electronics I",
    credits: 3,
    deptCode: "EEE",
    prereq: "EEE102",
  },
  { code: "EEE202", title: "Digital Electronics", credits: 3, deptCode: "EEE" },
  {
    code: "EEE301",
    title: "Electrical Machines I",
    credits: 3,
    deptCode: "EEE",
    prereq: "EEE201",
  },
  {
    code: "EEE302",
    title: "Power Systems",
    credits: 3,
    deptCode: "EEE",
    prereq: "EEE301",
  },
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
    prereq: "BBA101",
  },
  { code: "BBA202", title: "Business Statistics", credits: 3, deptCode: "BBA" },
] as const;

const FACULTY = [
  {
    empId: "EMP001",
    first: "Rahim",
    last: "Uddin",
    deptCode: "CSE",
    designation: "Associate Professor",
  },
  {
    empId: "EMP002",
    first: "Fatema",
    last: "Khatun",
    deptCode: "CSE",
    designation: "Assistant Professor",
  },
  {
    empId: "EMP003",
    first: "Kamal",
    last: "Hossain",
    deptCode: "EEE",
    designation: "Professor",
  },
  {
    empId: "EMP004",
    first: "Nasrin",
    last: "Akter",
    deptCode: "EEE",
    designation: "Assistant Professor",
  },
  {
    empId: "EMP005",
    first: "Shahidul",
    last: "Islam",
    deptCode: "BBA",
    designation: "Associate Professor",
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

// Cycle CSE / EEE / BBA across the 20 students
const DEPT_CYCLE = ["CSE", "EEE", "BBA"] as const;

// Program per department (index-aligned with DEPARTMENTS/PROGRAMS)
const PROGRAM_BY_DEPT: Record<string, string> = {
  CSE: "BSC-CSE",
  EEE: "BSC-EEE",
  BBA: "BBA-GEN",
};

// Sections offered in the completed semester (intro-level courses)
const COMPLETED_SEMESTER_SECTIONS = [
  {
    courseCode: "CSE101",
    facultyEmpId: "EMP001",
    room: "CSE-101",
    capacity: 40,
  },
  {
    courseCode: "CSE102",
    facultyEmpId: "EMP002",
    room: "CSE-102",
    capacity: 40,
  },
  {
    courseCode: "EEE101",
    facultyEmpId: "EMP003",
    room: "EEE-101",
    capacity: 40,
  },
  {
    courseCode: "BBA101",
    facultyEmpId: "EMP005",
    room: "BBA-101",
    capacity: 40,
  },
  {
    courseCode: "BBA102",
    facultyEmpId: "EMP005",
    room: "BBA-102",
    capacity: 40,
  },
] as const;

// Sections offered in the current (in-progress) semester
const CURRENT_SEMESTER_SECTIONS = [
  {
    courseCode: "CSE201",
    facultyEmpId: "EMP001",
    room: "CSE-201",
    capacity: 35,
  },
  {
    courseCode: "CSE203",
    facultyEmpId: "EMP002",
    room: "CSE-203",
    capacity: 35,
  },
  {
    courseCode: "CSE301",
    facultyEmpId: "EMP001",
    room: "CSE-301",
    capacity: 30,
  },
  {
    courseCode: "EEE102",
    facultyEmpId: "EMP003",
    room: "EEE-102",
    capacity: 35,
  },
  {
    courseCode: "EEE201",
    facultyEmpId: "EMP004",
    room: "EEE-201",
    capacity: 30,
  },
  {
    courseCode: "BBA201",
    facultyEmpId: "EMP005",
    room: "BBA-201",
    capacity: 35,
  },
] as const;

// ----------------------------------------------------------
// Reset (FK-safe deletion order — children before parents)
// ----------------------------------------------------------

async function resetDatabase() {
  console.log("Resetting database...");
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.feeInvoice.deleteMany();
  await prisma.result.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.sectionFaculty.deleteMany();
  await prisma.section.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.facultyProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.coursePrerequisite.deleteMany();
  await prisma.course.deleteMany();
  await prisma.semester.deleteMany();
  await prisma.program.deleteMany();
  await prisma.department.deleteMany();
  console.log("Database reset complete.");
}

// ----------------------------------------------------------
// Main seed routine
// ----------------------------------------------------------

async function main() {
  await resetDatabase();

  // --- Departments -----------------------------------------------------
  const departmentByCode: Record<string, { id: string }> = {};
  for (const d of DEPARTMENTS) {
    const dept = await prisma.department.create({
      data: {
        name: d.name,
        code: d.code,
        description: `Department of ${d.name}`,
        status: EntityStatus.ACTIVE,
      },
    });
    departmentByCode[d.code] = dept;
  }
  console.log(`Created ${DEPARTMENTS.length} departments.`);

  // --- Programs ----------------------------------------------------------
  const programByCode: Record<string, { id: string }> = {};
  for (const p of PROGRAMS) {
    const program = await prisma.program.create({
      data: {
        name: p.name,
        code: p.code,
        departmentId: departmentByCode[p.deptCode]!.id,
        durationYears: p.durationYears,
        totalCredits: p.totalCredits,
        status: EntityStatus.ACTIVE,
      },
    });
    programByCode[p.code] = program;
  }
  console.log(`Created ${PROGRAMS.length} programs.`);

  // --- Courses -------------------------------------------------------------
  const courseByCode: Record<
    string,
    { id: string; credits: number; deptCode: string }
  > = {};
  for (const c of COURSES) {
    const course = await prisma.course.create({
      data: {
        courseCode: c.code,
        title: c.title,
        description: `${c.title} — core course offered by the ${departmentByCode[c.deptCode] ? c.deptCode : ""} department.`,
        credits: c.credits,
        departmentId: departmentByCode[c.deptCode]!.id,
        status: CourseStatus.PUBLISHED,
      },
    });
    courseByCode[c.code] = {
      id: course.id,
      credits: c.credits,
      deptCode: c.deptCode,
    };
  }
  console.log(`Created ${COURSES.length} courses.`);

  // --- Course prerequisites -------------------------------------------------
  let prereqCount = 0;
  for (const c of COURSES) {
    if ("prereq" in c && c.prereq) {
      await prisma.coursePrerequisite.create({
        data: {
          courseId: courseByCode[c.code]!.id,
          prerequisiteId: courseByCode[c.prereq]!.id,
        },
      });
      prereqCount++;
    }
  }
  console.log(`Created ${prereqCount} course prerequisites.`);

  // --- Semesters -------------------------------------------------------------
  const completedSemester = await prisma.semester.create({
    data: {
      name: "Spring 2026",
      startDate: new Date("2026-01-10"),
      endDate: new Date("2026-05-15"),
      registrationStart: new Date("2025-12-01"),
      registrationEnd: new Date("2026-01-05"),
      status: SemesterStatus.COMPLETED,
    },
  });
  const currentSemester = await prisma.semester.create({
    data: {
      name: "Fall 2026",
      startDate: new Date("2026-09-01"),
      endDate: new Date("2026-12-20"),
      registrationStart: new Date("2026-08-01"),
      registrationEnd: new Date("2026-08-25"),
      status: SemesterStatus.CURRENT,
    },
  });
  console.log("Created 2 semesters (1 completed, 1 current).");

  // --- Admin user ----------------------------------------------------------
  let passwordHash = await hashPassword(config.admin_password);
  const adminUser = await prisma.user.create({
    data: {
      email: config.admin_email,
      passwordHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      firstName: config.admin_name,
      lastName: config.admin_name,
      emailVerified: true,
      lastLoginAt: new Date(),
    },
  });
  console.log("Created 1 admin user.");

  // --- Faculty (User + FacultyProfile) --------------------------------------
  passwordHash = await hashPassword(config.faculty_password);
  const facultyByEmpId: Record<string, { userId: string; profileId: string }> =
    {};
  for (const f of FACULTY) {
    const email = `${slug(f.first, f.last)}@university.edu`;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
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
        departmentId: departmentByCode[f.deptCode]!.id,
        designation: f.designation,
        specialization: `${f.deptCode} Systems`,
        joinDate: new Date("2019-08-01"),
      },
    });
    facultyByEmpId[f.empId] = { userId: user.id, profileId: profile.id };
  }
  console.log(`Created ${FACULTY.length} faculty accounts.`);

  // --- Students (User + StudentProfile) -------------------------------------
  const students: {
    userId: string;
    profileId: string;
    deptCode: string;
    studentId: string;
  }[] = [];
  for (let i = 0; i < STUDENT_NAMES.length; i++) {
    const [first, last] = STUDENT_NAMES[i]!;
    const deptCode = DEPT_CYCLE[i % DEPT_CYCLE.length]!;
    const studentId = `STU2026${String(i + 1).padStart(3, "0")}`;
    const email = `${slug(first, last)}@student.university.edu`;

    passwordHash = await hashPassword(config.student_password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: Role.STUDENT,
        status: UserStatus.ACTIVE,
        firstName: first,
        lastName: last,
        emailVerified: true,
        lastLoginAt: new Date(),
      },
    });

    const profile = await prisma.studentProfile.create({
      data: {
        userId: user.id,
        studentId,
        programId: programByCode[PROGRAM_BY_DEPT[deptCode]!]!.id,
        departmentId: departmentByCode[deptCode]!.id,
        currentSemesterId: currentSemester.id,
        batchYear: 2026,
        gender: i % 2 === 0 ? Gender.MALE : Gender.FEMALE,
        dateOfBirth: new Date(2003, i % 12, (i % 27) + 1),
        address: `House ${10 + i}, Road ${1 + (i % 8)}, Rajshahi, Bangladesh`,
        guardianName: `Guardian of ${first} ${last}`,
        guardianPhone: `+8801${randomInt(700000000, 799999999)}`,
        admissionDate: new Date("2026-01-10"),
      },
    });

    students.push({
      userId: user.id,
      profileId: profile.id,
      deptCode,
      studentId,
    });

    await prisma.notification.create({
      data: {
        userId: user.id,
        type: NotificationType.INFO,
        title: "Welcome to the University Portal",
        message: `Hi ${first}, your student account (${studentId}) has been created successfully.`,
      },
    });
  }
  console.log(`Created ${students.length} student accounts.`);

  // --- Sections + faculty assignment (completed semester) --------------------
  const completedSections: {
    id: string;
    courseCode: string;
    deptCode: string;
    credits: number;
  }[] = [];
  for (const s of COMPLETED_SEMESTER_SECTIONS) {
    const course = courseByCode[s.courseCode];
    const section = await prisma.section.create({
      data: {
        courseId: course!.id,
        semesterId: completedSemester.id,
        sectionName: "A",
        capacity: s.capacity,
        room: s.room,
        schedule: {
          days: ["Sunday", "Tuesday"],
          startTime: "09:00",
          endTime: "10:30",
        },
        status: SectionStatus.CLOSED,
      },
    });
    await prisma.sectionFaculty.create({
      data: {
        sectionId: section.id,
        facultyId: facultyByEmpId[s.facultyEmpId]!.profileId,
        isPrimary: true,
      },
    });
    completedSections.push({
      id: section.id,
      courseCode: s.courseCode,
      deptCode: course!.deptCode,
      credits: course!.credits,
    });
  }

  // --- Sections + faculty assignment (current semester) -----------------------
  const currentSections: {
    id: string;
    courseCode: string;
    deptCode: string;
    credits: number;
  }[] = [];
  for (const s of CURRENT_SEMESTER_SECTIONS) {
    const course = courseByCode[s.courseCode];
    const section = await prisma.section.create({
      data: {
        courseId: course!.id,
        semesterId: currentSemester!.id,
        sectionName: "A",
        capacity: s.capacity,
        room: s.room,
        schedule: {
          days: ["Monday", "Wednesday"],
          startTime: "11:00",
          endTime: "12:30",
        },
        status: SectionStatus.PUBLISHED,
      },
    });
    await prisma.sectionFaculty.create({
      data: {
        sectionId: section.id,
        facultyId: facultyByEmpId[s.facultyEmpId]!.profileId,
        isPrimary: true,
      },
    });
    currentSections.push({
      id: section.id,
      courseCode: s.courseCode,
      deptCode: course!.deptCode,
      credits: course!.credits,
    });

    // Notify the assigned faculty member
    await prisma.notification.create({
      data: {
        userId: facultyByEmpId[s.facultyEmpId]!.userId,
        type: NotificationType.ACADEMIC,
        title: "New Section Assigned",
        message: `You have been assigned to teach ${s.courseCode} (Section A) for Fall 2026.`,
      },
    });
  }
  console.log(
    `Created ${completedSections.length + currentSections.length} sections across both semesters.`,
  );

  // --- Enrollments, Attendance, Exams, Results (COMPLETED semester) -----------
  let enrollmentCount = 0;
  let attendanceCount = 0;
  let examCount = 0;
  let resultCount = 0;
  let auditCount = 0;

  const invoiceCounter = { value: 1 };
  let invoiceCount = 0;
  let paymentCount = 0;

  async function logAudit(
    actorId: string | null,
    action: AuditAction,
    entity: string,
    entityId: string,
    metadata?: object,
  ) {
    await prisma.auditLog.create({
      data: {
        actorId,
        action,
        entity,
        entityId,
        ...(metadata !== undefined ? { metadata } : {}),
      },
    });
    auditCount++;
  }

  for (const section of completedSections) {
    const deptStudents = students.filter(
      (s) => s.deptCode === section.deptCode,
    );

    // Midterm (30 marks) + Final (70 marks) — both already graded and published
    const midterm = await prisma.exam.create({
      data: {
        sectionId: section.id,
        examType: ExamType.MIDTERM,
        title: `${section.courseCode} Midterm Examination`,
        examDate: new Date("2026-03-01"),
        totalMarks: 30,
        weightage: 40,
        status: ExamStatus.COMPLETED,
      },
    });
    const final = await prisma.exam.create({
      data: {
        sectionId: section.id,
        examType: ExamType.FINAL,
        title: `${section.courseCode} Final Examination`,
        examDate: new Date("2026-05-10"),
        totalMarks: 70,
        weightage: 60,
        status: ExamStatus.COMPLETED,
      },
    });
    examCount += 2;

    for (const student of deptStudents) {
      const enrollment = await prisma.enrollment.create({
        data: {
          studentId: student.profileId,
          sectionId: section.id,
          status: EnrollmentStatus.COMPLETED,
          enrolledAt: new Date("2025-12-10"),
        },
      });
      enrollmentCount++;
      await logAudit(
        student.userId,
        AuditAction.ENROLL,
        "Enrollment",
        enrollment.id,
        { section: section.courseCode },
      );

      // Attendance: 6 weekly classes, mostly present
      for (let w = 0; w < 6; w++) {
        const classDate = new Date("2026-01-11");
        classDate.setDate(classDate.getDate() + w * 7);
        const status =
          Math.random() < 0.85
            ? AttendanceStatus.PRESENT
            : pick([AttendanceStatus.ABSENT, AttendanceStatus.LATE]);
        await prisma.attendance.create({
          data: {
            enrollmentId: enrollment.id,
            studentId: student.profileId,
            sectionId: section.id,
            classDate,
            status,
            markedById:
              facultyByEmpId[
                COMPLETED_SEMESTER_SECTIONS.find(
                  (c) => c.courseCode === section.courseCode,
                )!.facultyEmpId
              ]!.userId,
          },
        });
        attendanceCount++;
      }

      // Results: midterm + final, both published
      const midMarks = randomInt(18, 30);
      const finalMarks = randomInt(38, 70);
      const percentage = midMarks + finalMarks;
      const { grade, point } = gradeFromPercentage(percentage);
      const enteredBy =
        facultyByEmpId[
          COMPLETED_SEMESTER_SECTIONS.find(
            (c) => c.courseCode === section.courseCode,
          )!.facultyEmpId
        ]!.userId;

      const midResult = await prisma.result.create({
        data: {
          examId: midterm.id,
          studentId: student.profileId,
          enrollmentId: enrollment.id,
          marksObtained: midMarks,
          status: ResultStatus.PUBLISHED,
          publishedAt: new Date("2026-03-10"),
          enteredById: enteredBy,
        },
      });
      const finalResult = await prisma.result.create({
        data: {
          examId: final.id,
          studentId: student.profileId,
          enrollmentId: enrollment.id,
          marksObtained: finalMarks,
          grade,
          gradePoint: point,
          status: ResultStatus.PUBLISHED,
          publishedAt: new Date("2026-05-20"),
          enteredById: enteredBy,
        },
      });
      resultCount += 2;
      await logAudit(
        enteredBy,
        AuditAction.PUBLISH_RESULT,
        "Result",
        finalResult.id,
        { course: section.courseCode, grade },
      );
      void midResult;

      // Roll the final grade up onto the enrollment
      await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: { finalGrade: grade, gradePoint: point },
      });

      // Fee invoice for this semester — paid in full
      const invoiceNumber = `INV-2026-SPR-${String(invoiceCounter.value++).padStart(4, "0")}`;
      const invoice = await prisma.feeInvoice.create({
        data: {
          invoiceNumber,
          studentId: student.profileId,
          semesterId: completedSemester.id,
          description: "Spring 2026 Tuition & Fees",
          amount: 45000,
          dueDate: new Date("2026-01-20"),
          status: InvoiceStatus.PAID,
        },
      });
      invoiceCount++;

      const gateway = pick([
        PaymentGateway.STRIPE,
        PaymentGateway.BKASH,
        PaymentGateway.SSLCOMMERZ,
      ]);
      const payment = await prisma.payment.create({
        data: {
          transactionId: `TXN-${invoiceNumber}`,
          invoiceId: invoice.id,
          studentId: student.profileId,
          amount: 45000,
          gateway,
          status: PaymentStatus.SUCCESS,
          gatewayReference: `ref_${Math.random().toString(36).slice(2, 12)}`,
          paidAt: new Date("2026-01-18"),
        },
      });
      paymentCount++;
      await logAudit(
        student.userId,
        AuditAction.UPDATE_PAYMENT_STATUS,
        "Payment",
        payment.id,
        { status: "SUCCESS", invoice: invoiceNumber },
      );

      await prisma.notification.create({
        data: {
          userId: student.userId,
          type: NotificationType.PAYMENT,
          title: "Payment Successful",
          message: `Your payment of BDT 45,000 for invoice ${invoiceNumber} was received successfully.`,
        },
      });
      await prisma.notification.create({
        data: {
          userId: student.userId,
          type: NotificationType.ACADEMIC,
          title: "Results Published",
          message: `Your results for ${section.courseCode} (Spring 2026) have been published.`,
        },
      });
    }
  }
  console.log(
    "Seeded enrollments, attendance, exams, results, invoices, and payments for the completed semester.",
  );

  // --- Enrollments, Attendance, Exams (CURRENT semester — in progress) --------
  for (const section of currentSections) {
    const deptStudents = students.filter(
      (s) => s.deptCode === section.deptCode,
    );
    // Not every student re-enrolls in the advanced course — take up to 5 continuing students
    const enrolling = deptStudents.slice(0, Math.min(5, deptStudents.length));
    const facultyUserId =
      facultyByEmpId[
        CURRENT_SEMESTER_SECTIONS.find(
          (c) => c.courseCode === section.courseCode,
        )!.facultyEmpId
      ]!.userId;

    // Midterm scheduled but not yet graded; final not yet scheduled to occur
    const midterm = await prisma.exam.create({
      data: {
        sectionId: section.id,
        examType: ExamType.MIDTERM,
        title: `${section.courseCode} Midterm Examination`,
        examDate: new Date("2026-10-15"),
        totalMarks: 30,
        weightage: 40,
        status: ExamStatus.PUBLISHED,
      },
    });
    const final = await prisma.exam.create({
      data: {
        sectionId: section.id,
        examType: ExamType.FINAL,
        title: `${section.courseCode} Final Examination`,
        examDate: new Date("2026-12-10"),
        totalMarks: 70,
        weightage: 60,
        status: ExamStatus.DRAFT,
      },
    });
    examCount += 2;
    void midterm;
    void final;

    for (let idx = 0; idx < enrolling.length; idx++) {
      const student = enrolling[idx];
      // Demonstrate the DROPPED status on one enrollment for edge-case testing
      const isDropped =
        section.courseCode === "CSE301" && idx === enrolling.length - 1;

      const enrollment = await prisma.enrollment.create({
        data: {
          studentId: student!.profileId,
          sectionId: section.id,
          status: isDropped
            ? EnrollmentStatus.DROPPED
            : EnrollmentStatus.ENROLLED,
          enrolledAt: new Date("2026-08-20"),
          droppedAt: isDropped ? new Date("2026-09-05") : null,
        },
      });
      enrollmentCount++;
      await logAudit(
        student!.userId,
        AuditAction.ENROLL,
        "Enrollment",
        enrollment.id,
        { section: section.courseCode },
      );
      if (isDropped) {
        await logAudit(
          student!.userId,
          AuditAction.DROP_ENROLLMENT,
          "Enrollment",
          enrollment.id,
          { section: section.courseCode },
        );
        continue; // no attendance/invoice for a dropped enrollment
      }

      // Attendance so far this term (classes started Sept 1, 2026)
      for (const day of ["2026-09-02", "2026-09-04", "2026-09-07"]) {
        const status =
          Math.random() < 0.9
            ? AttendanceStatus.PRESENT
            : AttendanceStatus.ABSENT;
        await prisma.attendance.create({
          data: {
            enrollmentId: enrollment.id,
            studentId: student!.profileId,
            sectionId: section.id,
            classDate: new Date(day),
            status,
            markedById: facultyUserId,
          },
        });
        attendanceCount++;
      }

      // Fee invoice for the current semester — mixed payment states
      const invoiceNumber = `INV-2026-FAL-${String(invoiceCounter.value++).padStart(4, "0")}`;
      const paymentOutcome = pick([
        "PAID",
        "PENDING",
        "PENDING",
        "FAILED_ATTEMPT",
      ]);
      const invoice = await prisma.feeInvoice.create({
        data: {
          invoiceNumber,
          studentId: student!.profileId,
          semesterId: currentSemester.id,
          description: "Fall 2026 Tuition & Fees",
          amount: 45000,
          dueDate: new Date("2026-09-20"),
          status:
            paymentOutcome === "PAID"
              ? InvoiceStatus.PAID
              : InvoiceStatus.PENDING,
        },
      });
      invoiceCount++;
      await logAudit(
        adminUser.id,
        AuditAction.CREATE_INVOICE,
        "FeeInvoice",
        invoice.id,
        { student: student!.studentId },
      );

      if (paymentOutcome === "PAID") {
        const gateway = pick([
          PaymentGateway.STRIPE,
          PaymentGateway.BKASH,
          PaymentGateway.SSLCOMMERZ,
        ]);
        const payment = await prisma.payment.create({
          data: {
            transactionId: `TXN-${invoiceNumber}`,
            invoiceId: invoice.id,
            studentId: student!.profileId,
            amount: 45000,
            gateway,
            status: PaymentStatus.SUCCESS,
            gatewayReference: `ref_${Math.random().toString(36).slice(2, 12)}`,
            paidAt: new Date("2026-09-05"),
          },
        });
        paymentCount++;
        await logAudit(
          student!.userId,
          AuditAction.UPDATE_PAYMENT_STATUS,
          "Payment",
          payment.id,
          { status: "SUCCESS" },
        );
        await prisma.notification.create({
          data: {
            userId: student!.userId,
            type: NotificationType.PAYMENT,
            title: "Payment Successful",
            message: `Your payment of BDT 45,000 for invoice ${invoiceNumber} was received successfully.`,
          },
        });
      } else if (paymentOutcome === "FAILED_ATTEMPT") {
        const payment = await prisma.payment.create({
          data: {
            transactionId: `TXN-${invoiceNumber}`,
            invoiceId: invoice.id,
            studentId: student!.profileId,
            amount: 45000,
            gateway: PaymentGateway.SSLCOMMERZ,
            status: PaymentStatus.FAILED,
            gatewayReference: `ref_${Math.random().toString(36).slice(2, 12)}`,
          },
        });
        paymentCount++;
        await logAudit(
          student!.userId,
          AuditAction.UPDATE_PAYMENT_STATUS,
          "Payment",
          payment.id,
          { status: "FAILED" },
        );
        await prisma.notification.create({
          data: {
            userId: student!.userId,
            type: NotificationType.ERROR,
            title: "Payment Failed",
            message: `Your payment attempt for invoice ${invoiceNumber} failed. Please try again.`,
          },
        });
      } else {
        await prisma.notification.create({
          data: {
            userId: student!.userId,
            type: NotificationType.WARNING,
            title: "Fee Payment Due",
            message: `Invoice ${invoiceNumber} (BDT 45,000) is due on 2026-09-20.`,
          },
        });
      }
    }
  }
  console.log(
    "Seeded enrollments, attendance, exams, invoices, and payments for the current (in-progress) semester.",
  );

  // --- A couple of login/register audit entries for realism -------------------
  await logAudit(adminUser.id, AuditAction.LOGIN, "User", adminUser.id, {
    source: "seed",
  });
  for (const f of Object.values(facultyByEmpId)) {
    await logAudit(f!.userId, AuditAction.LOGIN, "User", f!.userId, {
      source: "seed",
    });
  }

  // --- One sample refresh token (e.g. for the admin's active session) ---------
  await prisma.refreshToken.create({
    data: {
      userId: adminUser.id,
      tokenHash: `seed_refresh_${Math.random().toString(36).slice(2, 20)}`,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      userAgent: "seed-script",
      ipAddress: "127.0.0.1",
    },
  });

  console.log(
    `Seeded ${enrollmentCount} enrollments, ${attendanceCount} attendance records, ${examCount} exams, ${resultCount} results, ${invoiceCount} invoices, ${paymentCount} payments, ${auditCount} audit logs.`,
  );

  // ----------------------------------------------------------
  // Summary
  // ----------------------------------------------------------
  console.log("\n==================== SEED COMPLETE ====================");
  console.log("---------------------------------------------------------");
  console.log("ADMIN     : admin@university.edu");
  console.log(
    "FACULTY   :",
    FACULTY.map((f) => `${slug(f.first, f.last)}@university.edu`).join(", "),
  );
  console.log(
    "STUDENT   :",
    `${slug(STUDENT_NAMES[0][0], STUDENT_NAMES[0][1])}@student.university.edu`,
    "(and 19 more, pattern firstname.lastname@student.university.edu)",
  );
  console.log("=========================================================\n");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
