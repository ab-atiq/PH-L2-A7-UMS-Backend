import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Request, type Response } from "express";
import config from "./config/index.js";
import { prisma } from "./lib/prisma.js";
import { globalErrorHandler } from "./middleware/globalErrorHandler.js";
import { notFound } from "./middleware/notFound.js";
import { AdminRoutes } from "./module/admin/admin.route.js";
import { AttendanceRoutes } from "./module/attendance/attendance.route.js";
import { AuditLogRoutes } from "./module/audit-log/audit-log.route.js";
import { AuthRoutes } from "./module/auth/auth.route.js";
import { CoursePrerequisiteRoutes } from "./module/course-prerequisite/course-prerequisite.route.js";
import { CourseRoutes } from "./module/course/course.route.js";
import { DepartmentRoutes } from "./module/department/department.route.js";
import { EnrollmentRoutes } from "./module/enrollment/enrollment.route.js";
import { ExamRoutes } from "./module/exam/exam.route.js";
import { FacultyRoutes } from "./module/faculty/faculty.route.js";
import { InvoiceRoutes } from "./module/invoice/invoice.route.js";
import { NotificationRoutes } from "./module/notification/notification.route.js";
import { PaymentRoutes } from "./module/payment/payment.route.js";
import { ProgramRoutes } from "./module/program/program.route.js";
import { ResultRoutes } from "./module/result/result.route.js";
import { SectionFacultyRoutes } from "./module/section-faculty/section-faculty.route.js";
import { SectionRoutes } from "./module/section/section.route.js";
import { SemesterRoutes } from "./module/semester/semester.route.js";
import { StudentRoutes } from "./module/student/student.route.js";
import { TranscriptRoutes } from "./module/transcript/transcript.route.js";
import { UserRoutes } from "./module/user/user.route.js";

const app = express();

app.use(
  cors({
    origin: config.frontend_url,
    credentials: true,
  }),
);

// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());

// app.use("/api/v1/users", UserRoutes);
app.use("/api/v1/user", UserRoutes);
app.use("/api/v1/admin", AdminRoutes);
app.use("/api/v1/departments", DepartmentRoutes);
app.use("/api/v1/programs", ProgramRoutes);
app.use("/api/v1/courses", CourseRoutes);
app.use("/api/v1/course-prerequisites", CoursePrerequisiteRoutes);
app.use("/api/v1/semesters", SemesterRoutes);
app.use("/api/v1/students", StudentRoutes);
app.use("/api/v1/sections", SectionRoutes);
app.use("/api/v1/section-faculty", SectionFacultyRoutes);
app.use("/api/v1/faculty", FacultyRoutes);
app.use("/api/v1/enrollments", EnrollmentRoutes);
app.use("/api/v1/attendance", AttendanceRoutes);
app.use("/api/v1/exams", ExamRoutes);
app.use("/api/v1/results", ResultRoutes);
app.use("/api/v1/invoices", InvoiceRoutes);
app.use("/api/v1/payments", PaymentRoutes);
app.use("/api/v1/notifications", NotificationRoutes);
app.use("/api/v1/transcripts", TranscriptRoutes);
app.use("/api/v1/audit-logs", AuditLogRoutes);
app.use("/api/v1/auth", AuthRoutes);

app.get("/", (req: Request, res: Response) => {
  res.send("Hello World!");
});

app.get("/check-users", (req: Request, res: Response) => {
  res.json([
    { id: 1, name: "John Doe" },
    { id: 2, name: "Jane Doe" },
  ]);
});

app.get("/users", async (req: Request, res: Response) => {
  await prisma.user
    .findMany({
      omit: {
        passwordHash: true,
      },
    })
    .then((users: any[]) => {
      res.json(users);
    })
    .catch((error: any) => {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Internal Server Error" });
    });
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;
