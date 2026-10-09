# University Management System (UMS) — Backend Project Requirements

## 1. Overview

A production-ready **University Management System (UMS)** RESTful backend built with **Node.js, Express.js, TypeScript, PostgreSQL, and Prisma**. The system digitizes university academic operations across the entire student, faculty, and administrative lifecycle.

### Core Architectural Model (Program Curriculum)

Unlike traditional systems based on arbitrary calendar semesters and elective section picking, this system implements a **fixed program curriculum model**:

- Each degree **Program** has a fixed number of **ProgramSemester** slots driven by its degree level (`BSC` = 8, `MSC` = 4, `PHD` = 6).
- Each program semester contains pre-defined **SemesterCourse** curriculum placements with a single assigned faculty teacher (no separate section entities).
- Academic progression is strictly **gated at the semester level**: a student cannot start semester $N$ until their `SemesterEnrollment` for semester $N-1$ is `COMPLETED`.
- Enrolling in a semester automatically enrolls the student in every course of that semester (`CourseEnrollment`).
- Fees are split into a one-time **Admission Fee** (`InvoiceType.ADMISSION`) and a flat recurring **Semester Tuition Fee** (`InvoiceType.SEMESTER`).

```
Department → Program (DegreeType BSC/MSC/PHD) → ProgramSemester (Fixed slots)
           → SemesterCourse (Course + Single Assigned Teacher)
           → Admission Fee Payment → Semester Enrollment (Gates progression)
           → Course Enrollment (Auto-enrolled per semester)
           → Attendance → Exam → Result (Published)
           → Semester Completion (GPA computed) → Next Semester Unlocks → Official Transcript
```

---

## 2. Mandatory Technology Stack

| Concern              | Technology                       | Notes                                                          |
| -------------------- | -------------------------------- | -------------------------------------------------------------- |
| **Runtime**          | Node.js (v18+) + TypeScript      | Strict typing, ES Modules or CommonJS                          |
| **Framework**        | Express.js                       | Modular router architecture                                    |
| **Database**         | PostgreSQL                       | Relational DB with foreign keys, composite uniques, indexes    |
| **ORM**              | Prisma (v5.15+ / v6+)            | Multi-file schema (`previewFeatures = ["prismaSchemaFolder"]`) |
| **Validation**       | Zod                              | Request body, query, and param validation                      |
| **Authentication**   | JWT (Access + Refresh Token)     | Bearer auth header, revocable refresh tokens in database       |
| **Social Auth**      | Google OAuth 2.0                 | GCP integration for student/faculty login                      |
| **Password Hashing** | bcryptjs / bcrypt                | Salt rounds $\ge 10$                                           |
| **API Versioning**   | `/api/v1` prefix                 | Consistent prefix on all endpoints                             |
| **Payments**         | Stripe, bKash, SSLCommerz        | Real payment sessions + server-to-server webhook verification  |
| **Security**         | Helmet, CORS, express-rate-limit | Strict headers, sanitized responses                            |
| **File Upload**      | Multer / Cloudinary / S3         | User avatar / profile image handling                           |
| **Architecture**     | Modular Clean Architecture       | Controller-Service-Repository/Prisma pattern                   |

---

## 3. Roles & Permissions (Exactly 3 Roles)

1. **STUDENT** — Academic self-service, view curriculum, pay fees, view attendance, exams, published results, and transcripts.
2. **FACULTY** — Teaching, attendance marking, exam creation, mark entry, result submission.
3. **ADMIN** — Full university configuration, academic structure, curriculum assignment, user management, result publishing, fee management, financial reporting, and audit trail.

### 3.1 Role Responsibility Matrix

| Capability                                              |       STUDENT       |          FACULTY          |       ADMIN       |
| ------------------------------------------------------- | :-----------------: | :-----------------------: | :---------------: |
| Self-registration & Email Verification (OTP)            |         ✅          |     — (Admin created)     | — (System seeded) |
| Login / Refresh Token / Logout / Password Reset         |         ✅          |            ✅             |        ✅         |
| View & Update Own Profile / Upload Avatar               |         ✅          |            ✅             |        ✅         |
| View Departments, Programs, Course Catalog              |         ✅          |            ✅             |  ✅ (Full CRUD)   |
| Build Curriculum (`ProgramSemester` & `SemesterCourse`) |          —          |             —             |        ✅         |
| View Assigned Courses (`SemesterCourse`)                |          —          |    ✅ (Assigned only)     |     ✅ (All)      |
| Pay Admission Fee (`InvoiceType.ADMISSION`)             |         ✅          |             —             |    ✅ (Manage)    |
| Enroll in Semester (`SemesterEnrollment`)               |         ✅          |             —             |    ✅ (Manage)    |
| View Auto-Created Course Enrollments                    |         ✅          |  ✅ (Enrolled students)   |        ✅         |
| Drop a Course Enrollment (`EnrollmentStatus.DROPPED`)   |      ✅ (Own)       |             —             |        ✅         |
| Mark Attendance                                         |          —          | ✅ (Assigned course only) |        ✅         |
| View Attendance                                         | ✅ (Own read-only)  |   ✅ (Assigned course)    |     ✅ (All)      |
| Create & Update Exams                                   |          —          |   ✅ (Assigned course)    |        ✅         |
| Enter & Update Marks (Results)                          |          —          |   ✅ (Assigned course)    |        ✅         |
| Review & Publish Exam Results                           |          —          |             —             |        ✅         |
| View Exam Results                                       | ✅ (Published only) |  ✅ (Draft & Published)   |     ✅ (All)      |
| Mark Semester Completed & Calculate GPA                 |          —          |             —             |        ✅         |
| View Official Transcript & CGPA                         |      ✅ (Own)       |             —             |     ✅ (All)      |
| Create Invoices (`ADMISSION`, `SEMESTER`)               |          —          |             —             |        ✅         |
| View & Initiate Invoice Payments                        |      ✅ (Own)       |             —             |     ✅ (All)      |
| Payment Gateway Webhook Callback                        |          —          |             —             | System / Webhook  |
| In-App Notifications                                    |      ✅ (Own)       |         ✅ (Own)          |     ✅ (All)      |
| User Directory & Status Management (Suspend/Activate)   |          —          |             —             |        ✅         |
| System Audit Logs & Dashboard Analytics                 |          —          |             —             |        ✅         |

---

## 4. Core Business Workflows

### Workflow 1: Registration, Verification & Profile Setup

1. **Student Registration**: Candidate registers via `POST /api/v1/auth/register`. Default role is `STUDENT`, status is `PENDING_VERIFICATION`. System sends email OTP.
2. **Email Verification**: Candidate verifies email via `POST /api/v1/auth/verify-email`. Status becomes `ACTIVE`.
3. **Student Profile**: Student profile created via `POST /api/v1/students` with personal info, guardian details, and selected program.
4. **Faculty Setup**: Faculty accounts are provisioned by Admin via `POST /api/v1/faculty`, linking user credentials with employee ID, designation, and department.

### Workflow 2: Academic Setup & Curriculum Building (Admin)

1. **Departments**: Admin creates academic departments (`CSE`, `EEE`, `BBA`) via `POST /api/v1/departments`.
2. **Programs**: Admin creates degree programs (`POST /api/v1/programs`) selecting `degreeType` (`BSC`, `MSC`, `PHD`), `durationYears`, `totalCredits`, `admissionFee`, and `semesterFee`.
3. **Slot Provisioning**: Backend automatically provisions the required sequence of `ProgramSemester` slots (8 for `BSC`, 4 for `MSC`, 6 for `PHD`).
4. **Course Catalog**: Admin creates reusable course catalog entries (`POST /api/v1/courses`).
5. **Curriculum Placement (`SemesterCourse`)**: For each `ProgramSemester`, Admin adds courses via `POST /api/v1/program-semesters/:id/courses`, assigning a single faculty teacher.

### Workflow 3: Program Admission & Admission Invoicing

1. When a student chooses a program, a one-time admission invoice (`FeeInvoice.type = ADMISSION`) is generated for `program.admissionFee`.
2. Student initiates payment (`POST /api/v1/payments/initiate`) via Stripe, bKash, or SSLCommerz.
3. Gateway webhook (`POST /api/v1/payments/webhook`) confirms payment: invoice marked `PAID`, `Payment.status = SUCCESS`.
4. Admission fee payment unlocks eligibility for **Semester 1 Enrollment**.

### Workflow 4: Semester Enrollment (Prisma Transaction)

1. Student enrolls in current semester via `POST /api/v1/semester-enrollments`.
2. **Backend Transaction Validates**:
   - Admission fee is `PAID` (cannot enroll in any semester otherwise).
   - If semester number $N > 1$, verify `SemesterEnrollment` for semester $N-1$ has `status = COMPLETED`.
   - Prevent duplicate enrollment in the same `ProgramSemester`.
3. **On Success**:
   - `SemesterEnrollment` created with `status = IN_PROGRESS`.
   - Automatically creates a `CourseEnrollment` (`status = ENROLLED`) for every `SemesterCourse` assigned to that `ProgramSemester`.
   - Automatically generates a recurring tuition fee invoice (`FeeInvoice.type = SEMESTER`) for `program.semesterFee`.

### Workflow 5: Attendance Management

1. Faculty opens their assigned course (`GET /api/v1/faculty/my-courses`).
2. Faculty marks attendance for a class date via `POST /api/v1/attendance`:
   - System verifies the authenticated user is the assigned teacher for `semesterCourseId`.
   - Unique constraint `@@unique([studentId, semesterCourseId, classDate])` prevents duplicate attendance records.
3. Students have strictly read-only access to their own attendance records (`GET /api/v1/attendance/my`).

### Workflow 6: Exam & Result Lifecycle

1. **Exam Creation**: Assigned faculty creates an exam (Midterm, Final, Quiz) via `POST /api/v1/exams` setting date, `totalMarks`, and `weightage`.
2. **Marks Entry**: Faculty enters marks via `POST /api/v1/results`:
   - System validates `0 <= marksObtained <= exam.totalMarks`.
   - System auto-computes letter grade (`Grade`) and grade point (`gradePoint`).
   - Saved with `status = DRAFT` or `SUBMITTED`.
3. **Publishing**: Admin reviews exam marks and calls `POST /api/v1/exams/:id/publish-results`:
   - Results change to `status = PUBLISHED`.
   - Students can now view their grades (`GET /api/v1/results/my`). Students can **never** view results with `status != PUBLISHED`.

### Workflow 7: Semester Completion & GPA Calculation

1. When all exams for the semester are completed and published, Admin executes `POST /api/v1/semester-enrollments/:id/complete`.
2. System calculates **Semester GPA** based on course credit weightage:
   $$\text{GPA} = \frac{\sum (\text{Course Credits} \times \text{Grade Point})}{\sum \text{Course Credits}}$$
3. `SemesterEnrollment.status` transitions to `COMPLETED`, `completedAt` timestamp is recorded.
4. `StudentProfile.currentProgramSemesterId` updates to semester $N+1$, unlocking enrollment for the next semester.

### Workflow 8: Official Transcript

1. Student requests transcript via `GET /api/v1/transcripts/my`.
2. System retrieves all `COMPLETED` semester enrollments, their nested course grades, semester GPAs, and calculates overall **Cumulative GPA (CGPA)** and total earned credits.

### Workflow 9: Real Payment Gateway Integration

1. Student clicks pay on an invoice (`POST /api/v1/payments/initiate`).
2. Backend creates an initiated `Payment` record and returns checkout URL (Stripe Checkout Session, bKash Create Payment, or SSLCommerz Session).
3. Student completes payment on the provider portal.
4. Provider calls the server-to-server webhook endpoint (`POST /api/v1/payments/webhook`):
   - Server validates webhook signature.
   - Idempotently updates `Payment.status = SUCCESS` (or `FAILED`).
   - Updates `FeeInvoice.status = PAID`.
   - Emits in-app `Notification` and logs `AuditLog`.
5. Frontend or clients **never** mark payment successful directly.

---

## 5. Database Entities & Multi-File Schema

Located in `prisma/schema/` using Prisma's multi-file schema feature:

```
prisma/schema/
├── schema.prisma               # Generator & PostgreSQL datasource
├── enums.prisma                # All 19 domain enums
├── user.prisma                 # User, RefreshToken
├── profiles.prisma             # StudentProfile, FacultyProfile
├── academic-structure.prisma   # Department, Program, Course
├── program-semesters.prisma    # ProgramSemester, SemesterCourse (Curriculum)
├── enrollment-attendance.prisma# SemesterEnrollment, CourseEnrollment, Attendance
├── exams-results.prisma        # Exam, Result
├── finance.prisma              # FeeInvoice, Payment
└── notifications-audit.prisma  # Notification, AuditLog
```

### 5.1 Enums (19 Total)

1. `Role`: `STUDENT`, `FACULTY`, `ADMIN`
2. `UserStatus`: `ACTIVE`, `INACTIVE`, `SUSPENDED`, `PENDING_VERIFICATION`
3. `Gender`: `MALE`, `FEMALE`, `OTHER`
4. `EntityStatus`: `ACTIVE`, `INACTIVE`
5. `CourseStatus`: `DRAFT`, `PUBLISHED`, `ARCHIVED`
6. `DegreeType`: `BSC` (8 sem), `MSC` (4 sem), `PHD` (6 sem)
7. `StudentSemesterStatus`: `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`, `FAILED`
8. `EnrollmentStatus`: `ENROLLED`, `DROPPED`, `COMPLETED`, `FAILED`
9. `AttendanceStatus`: `PRESENT`, `ABSENT`, `LATE`, `EXCUSED`
10. `ExamType`: `QUIZ`, `ASSIGNMENT`, `MIDTERM`, `FINAL`, `PROJECT`
11. `ExamStatus`: `DRAFT`, `PUBLISHED`, `COMPLETED`, `CANCELLED`
12. `ResultStatus`: `DRAFT`, `SUBMITTED`, `PUBLISHED`
13. `Grade`: `A_PLUS`, `A`, `A_MINUS`, `B_PLUS`, `B`, `B_MINUS`, `C_PLUS`, `C`, `C_MINUS`, `D`, `F`, `I`, `W`
14. `InvoiceType`: `ADMISSION`, `SEMESTER`
15. `InvoiceStatus`: `PENDING`, `PAID`, `OVERDUE`, `CANCELLED`
16. `PaymentGateway`: `STRIPE`, `BKASH`, `SSLCOMMERZ`
17. `PaymentStatus`: `INITIATED`, `PENDING`, `SUCCESS`, `FAILED`, `CANCELLED`, `REFUNDED`
18. `NotificationType`: `INFO`, `WARNING`, `SUCCESS`, `ERROR`, `PAYMENT`, `ACADEMIC`
19. `AuditAction`: `LOGIN`, `LOGOUT`, `REGISTER`, `ROLE_CHANGE`, `CREATE`, `UPDATE`, `DELETE`, `ASSIGN_TEACHER`, `ENROLL`, `DROP_ENROLLMENT`, `MARK_ATTENDANCE`, `UPDATE_ATTENDANCE`, `CREATE_EXAM`, `UPDATE_EXAM`, `CREATE_RESULT`, `UPDATE_RESULT`, `PUBLISH_RESULT`, `CREATE_INVOICE`, `UPDATE_PAYMENT_STATUS`, `ADMIN_ACTION`

### 5.2 Entity Relationships & Constraints Summary

| Entity               | Primary Key | Key Foreign Keys                                                  | Unique Constraints                         | Key Indexes                                         |
| -------------------- | ----------- | ----------------------------------------------------------------- | ------------------------------------------ | --------------------------------------------------- |
| `User`               | UUID        | —                                                                 | `email`, `googleId`                        | `email`, `role`, `status`                           |
| `RefreshToken`       | UUID        | `userId` → `User`                                                 | `tokenHash`                                | `userId`, `expiresAt`                               |
| `StudentProfile`     | UUID        | `userId`, `programId`, `departmentId`, `currentProgramSemesterId` | `userId`, `studentId`                      | `studentId`, `programId`, `departmentId`            |
| `FacultyProfile`     | UUID        | `userId`, `departmentId`                                          | `userId`, `employeeId`                     | `employeeId`, `departmentId`                        |
| `Department`         | UUID        | —                                                                 | `code`                                     | `code`, `status`                                    |
| `Program`            | UUID        | `departmentId` → `Department`                                     | `code`                                     | `code`, `departmentId`, `status`, `degreeType`      |
| `Course`             | UUID        | `departmentId` → `Department`                                     | `courseCode`                               | `courseCode`, `departmentId`, `status`              |
| `ProgramSemester`    | UUID        | `programId` → `Program`                                           | `[programId, semesterNumber]`              | `programId`, `status`                               |
| `SemesterCourse`     | UUID        | `programSemesterId`, `courseId`, `teacherId`                      | `[programSemesterId, courseId]`            | `programSemesterId`, `courseId`, `teacherId`        |
| `SemesterEnrollment` | UUID        | `studentId`, `programSemesterId`                                  | `[studentId, programSemesterId]`           | `studentId`, `programSemesterId`, `status`          |
| `CourseEnrollment`   | UUID        | `studentId`, `semesterCourseId`, `semesterEnrollmentId`           | `[studentId, semesterCourseId]`            | `studentId`, `semesterCourseId`, `status`           |
| `Attendance`         | UUID        | `courseEnrollmentId`, `studentId`, `semesterCourseId`             | `[studentId, semesterCourseId, classDate]` | `semesterCourseId`, `studentId`, `classDate`        |
| `Exam`               | UUID        | `semesterCourseId` → `SemesterCourse`                             | —                                          | `semesterCourseId`, `examDate`, `status`            |
| `Result`             | UUID        | `examId`, `studentId`, `courseEnrollmentId`                       | `[examId, studentId]`                      | `examId`, `studentId`, `status`                     |
| `FeeInvoice`         | UUID        | `studentId`, `programId` (opt), `semesterEnrollmentId` (opt)      | `invoiceNumber`                            | `studentId`, `status`, `dueDate`, `type`            |
| `Payment`            | UUID        | `invoiceId`, `studentId`                                          | `transactionId`                            | `invoiceId`, `studentId`, `status`, `transactionId` |
| `Notification`       | UUID        | `userId` → `User`                                                 | —                                          | `userId`, `isRead`, `createdAt`                     |
| `AuditLog`           | UUID        | `actorId` → `User` (opt)                                          | —                                          | `actorId`, `action`, `entity`, `entityId`           |

---

## 6. Standard API Envelope

Every API response strictly adheres to this JSON structure:

### Success Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation successful",
  "data": {},
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

### Error Response

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation error or business rule violation",
  "errorSources": [
    {
      "path": "email",
      "message": "Invalid email address"
    }
  ],
  "stack": "Error stack trace (development mode only)"
}
```

---

## 7. Full API Endpoint Catalog (Aligned with Postman Collection)

### 7.1 Authentication (`/api/v1/auth`)

- `POST /api/v1/auth/register` — Self-register student candidate.
- `POST /api/v1/auth/verify-email` — Verify account using email OTP.
- `POST /api/v1/auth/login` — Login with credentials (returns access & refresh tokens).
- `POST /api/v1/auth/refresh-token` — Rotate access token using valid refresh token.
- `POST /api/v1/auth/logout` — Revoke active refresh token session.
- `POST /api/v1/auth/forgot-password` — Request password reset OTP.
- `POST /api/v1/auth/reset-password` — Reset password using OTP.
- `GET /api/v1/auth/google` — Initiate Google OAuth.
- `GET /api/v1/auth/google/callback` — Google OAuth callback.

### 7.2 Users & Profiles (`/api/v1/users`, `/api/v1/students`, `/api/v1/faculty`)

- `GET /api/v1/users/me` — Authenticated user's profile and role details.
- `PATCH /api/v1/users/me` — Update personal name and contact information.
- `PATCH /api/v1/users/profile-image` — Upload avatar image.
- `POST /api/v1/students` — [ADMIN] Create student profile with program assignment.
- `GET /api/v1/students/:studentId` — Get student profile by student ID (e.g. `STU2026001`).
- `PATCH /api/v1/students/:studentId` — Update student profile details.
- `DELETE /api/v1/students/:studentId` — [ADMIN] Soft-delete student profile.
- `POST /api/v1/faculty` — [ADMIN] Create faculty profile.
- `PATCH /api/v1/faculty/:employeeId` — [ADMIN] Update faculty designation/specialization.
- `GET /api/v1/faculty` — Search & list faculty members.
- `GET /api/v1/faculty/filter` — Filter faculty by designation, department, etc.
- `GET /api/v1/faculty/:employeeId` — Get faculty profile by employee ID.
- `DELETE /api/v1/faculty/:employeeId` — [ADMIN] Soft-delete faculty profile.

### 7.3 Departments (`/api/v1/departments`)

- `POST /api/v1/departments` — [ADMIN] Create department.
- `GET /api/v1/departments` — List active departments (with pagination & search).
- `GET /api/v1/departments/:id` — Get department by ID.
- `PATCH /api/v1/departments/:id` — [ADMIN] Update department.
- `DELETE /api/v1/departments/:id` — [ADMIN] Soft-delete department.

### 7.4 Programs (`/api/v1/programs`)

- `POST /api/v1/programs` — [ADMIN] Create program (auto-provisions 8/4/6 ProgramSemesters).
- `GET /api/v1/programs` — List active programs.
- `GET /api/v1/programs/:id` — Get program details.
- `PATCH /api/v1/programs/:id` — [ADMIN] Update program credits/fees.
- `DELETE /api/v1/programs/:id` — [ADMIN] Soft-delete program.
- `GET /api/v1/programs/:id/semesters` — Get program curriculum (all semesters & assigned courses).

### 7.5 Courses (`/api/v1/courses`)

- `POST /api/v1/courses` — [ADMIN] Create course catalog entry.
- `GET /api/v1/courses` — List courses (paginated, sorted).
- `GET /api/v1/courses/search?q=` — Search courses.
- `GET /api/v1/courses/:id` — Get course details.
- `PATCH /api/v1/courses/:id` — [ADMIN] Update course.
- `DELETE /api/v1/courses/:id` — [ADMIN] Soft-delete course.

### 7.6 Program Curriculum (`/api/v1/program-semesters`, `/api/v1/semester-courses`)

- `GET /api/v1/program-semesters/:id` — Get semester slot details.
- `PATCH /api/v1/program-semesters/:id` — [ADMIN] Update semester slot status.
- `POST /api/v1/program-semesters/:id/courses` — [ADMIN] Assign course and teacher to semester slot.
- `GET /api/v1/program-semesters/:id/courses` — List courses placed in a semester slot.
- `PATCH /api/v1/semester-courses/:id` — [ADMIN] Reassign teacher or update semester course status.
- `DELETE /api/v1/semester-courses/:id` — [ADMIN] Remove course placement from semester slot.
- `GET /api/v1/faculty/my-courses` — [FACULTY] List assigned courses for authenticated faculty.

### 7.7 Semester Enrollments (`/api/v1/semester-enrollments`)

- `POST /api/v1/semester-enrollments` — [STUDENT] Enroll in semester (validates admission fee & previous completion; auto-creates course enrollments).
- `GET /api/v1/semester-enrollments/my` — [STUDENT] List student's semester enrollment history.
- `GET /api/v1/semester-enrollments/:id` — Get semester enrollment detail with nested course grades.
- `POST /api/v1/semester-enrollments/:id/complete` — [ADMIN] Complete semester, compute GPA, unlock next semester.

### 7.8 Course Enrollments (`/api/v1/course-enrollments`)

- `GET /api/v1/course-enrollments/my` — [STUDENT] View enrolled courses for a semester.
- `GET /api/v1/course-enrollments/:id` — Get single course enrollment details.
- `DELETE /api/v1/course-enrollments/:id` — [STUDENT/ADMIN] Drop a course enrollment (`DROPPED`).

### 7.9 Attendance (`/api/v1/attendance`)

- `POST /api/v1/attendance` — [FACULTY] Bulk mark attendance for assigned course.
- `GET /api/v1/attendance/my` — [STUDENT] View own attendance (read-only).
- `GET /api/v1/semester-courses/:id/attendance` — [FACULTY/ADMIN] View class attendance for a course/date.
- `PATCH /api/v1/attendance/:id` — [FACULTY/ADMIN] Update an attendance record.

### 7.10 Exams (`/api/v1/exams`)

- `POST /api/v1/exams` — [FACULTY] Create an exam for assigned course.
- `GET /api/v1/exams` — List exams for a semester course.
- `GET /api/v1/exams/:id` — Get exam details.
- `PATCH /api/v1/exams/:id` — [FACULTY] Update exam date, marks, or status.

### 7.11 Results (`/api/v1/results`)

- `POST /api/v1/results` — [FACULTY] Enter marks for a student's exam.
- `PATCH /api/v1/results/:id` — [FACULTY] Update entered marks.
- `GET /api/v1/results/my` — [STUDENT] View own published exam results.
- `GET /api/v1/exams/:id/results` — [FACULTY/ADMIN] View all marks for an exam.
- `POST /api/v1/exams/:id/publish-results` — [ADMIN] Publish exam results.

### 7.12 Transcripts (`/api/v1/transcripts`)

- `GET /api/v1/transcripts/my` — [STUDENT] Generate official transcript with semester GPAs and CGPA.

### 7.13 Invoices (`/api/v1/invoices`)

- `POST /api/v1/invoices` — [ADMIN] Create invoice (`type = ADMISSION` or `SEMESTER`).
- `GET /api/v1/invoices` — [ADMIN] List all invoices with filters.
- `GET /api/v1/invoices/my` — [STUDENT] View own pending and paid invoices.
- `GET /api/v1/invoices/:id` — Get invoice details and payment attempts.

### 7.14 Payments (`/api/v1/payments`)

- `POST /api/v1/payments/initiate` — [STUDENT] Create payment session (Stripe/bKash/SSLCommerz).
- `GET /api/v1/payments/checkout` — Stripe checkout session redirect.
- `POST /api/v1/payments/bkash` — bKash checkout initiation.
- `POST /api/v1/payments/webhook` — Public webhook callback verifying gateway transaction.
- `GET /api/v1/payments/:id` — Get payment transaction details.

### 7.15 Notifications (`/api/v1/notifications`)

- `GET /api/v1/notifications` — List authenticated user's notifications.
- `PATCH /api/v1/notifications/:id/read` — Mark notification as read.

### 7.16 Admin & Audit Logs (`/api/v1/admin`, `/api/v1/audit-logs`)

- `GET /api/v1/admin/dashboard-stats` — [ADMIN] System-wide analytics & revenue stats.
- `GET /api/v1/admin/users` — [ADMIN] List users with filtering and search.
- `PATCH /api/v1/admin/users/:id/status` — [ADMIN] Activate/suspend user account.
- `GET /api/v1/audit-logs` — [ADMIN] View immutable system audit log entries.

---

## 8. Clean Modular Architecture — Folder Structure

```
src/
├── app.ts                         # Express app setup, middlewares, routes
├── server.ts                      # Server entry point, DB connection, port listener
├── config/
│   └── index.ts                   # Environment variables loaded via dotenv + Zod
├── lib/
│   └── prisma.ts                  # Singleton PrismaClient instance
├── middlewares/
│   ├── auth.middleware.ts         # JWT Bearer verification
│   ├── role.middleware.ts         # Strict RBAC guard: auth(Role.ADMIN, ...)
│   ├── validate.middleware.ts     # Zod schema validation middleware
│   ├── error.middleware.ts        # Global error handler with standard envelope
│   └── rateLimit.middleware.ts    # express-rate-limit configuration
├── errors/
│   ├── AppError.ts                # Custom AppError extending Error
│   └── handleZodError.ts          # Normalizes Zod issues into standard envelope
├── modules/
│   ├── auth/                      # route, controller, service, validation, utils
│   ├── user/                      # user management, profile, avatar upload
│   ├── student/                   # student profiles CRUD & search
│   ├── faculty/                   # faculty profiles CRUD & search
│   ├── department/                # academic departments CRUD
│   ├── program/                   # degree programs CRUD
│   ├── course/                    # reusable course catalog
│   ├── curriculum/                # ProgramSemester & SemesterCourse management
│   ├── semesterEnrollment/        # semester progression gating & completion
│   ├── courseEnrollment/          # course enrollment & drop logic
│   ├── attendance/                # faculty attendance marking & student read
│   ├── exam/                      # exam scheduling & status transitions
│   ├── result/                    # marks entry, grading, admin publication
│   ├── transcript/                # GPA & CGPA calculation, official transcript
│   ├── invoice/                   # admission & semester fee invoicing
│   ├── payment/                   # gateway initiation & webhook handling
│   ├── notification/              # in-app notification dispatch & read
│   ├── admin/                     # dashboard analytics & user moderation
│   └── auditLog/                  # append-only system audit log reader
└── utils/
    ├── catchAsync.ts              # Async request handler wrapper
    ├── sendResponse.ts            # Standard success response formatter
    └── grading.ts                 # Percentage-to-grade & grade-point converter
```

---

## 9. Seed Data Specifications

The seed script (`seed.ts`) provides an idempotent, realistic test environment matching the Postman collection:

- **Password for ALL demo accounts**: `Passw0rd!123`
- **1 Admin**: `admin@university.edu`
- **5 Faculty**:
  - `EMP001` (CSE): `rahim.uddin@university.edu` (Associate Professor)
  - `EMP002` (CSE): `fatema.khatun@university.edu` (Assistant Professor)
  - `EMP003` (EEE): `kamal.hossain@university.edu` (Professor)
  - `EMP004` (EEE): `nasrin.akter@university.edu` (Assistant Professor)
  - `EMP005` (BBA): `shahidul.islam@university.edu` (Associate Professor)
- **3 Departments**: CSE, EEE, BBA
- **5 Programs**:
  - `BSC-CSE` (8 semesters, ৳5,000 admission fee, ৳50,000 semester fee)
  - `BSC-EEE` (8 semesters, ৳4,000 admission fee, ৳50,000 semester fee)
  - `BBA-GEN` (8 semesters, ৳4,000 admission fee, ৳50,000 semester fee)
  - `MSC-CSE` (4 semesters, ৳6,000 admission fee, ৳50,000 semester fee)
  - `PHD-CSE` (6 semesters, ৳8,000 admission fee, ৳50,000 semester fee)
- **34 ProgramSemester Rows**: Pre-provisioned numbered slots (8 + 8 + 8 + 4 + 6).
- **26 Courses**: 10 CSE (2 doubled-up semesters), 8 EEE, 8 BBA courses.
- **26 SemesterCourse Placements**: All courses placed in curriculum slots with assigned teachers.
- **20 Students**: Cycled across `BSC-CSE`, `BSC-EEE`, and `BBA-GEN`:
  - **Admission Fee**: Paid in full with successful payment records.
  - **Semester 1 (COMPLETED)**:
    - `SemesterEnrollment.status = COMPLETED`, calculated GPA.
    - All course enrollments `COMPLETED` with final grades (`A_PLUS`, `A`, etc.) and grade points.
    - 6 attendance dates recorded per course.
    - Midterm and Final exams marked `COMPLETED` with `PUBLISHED` results.
    - Semester 1 tuition invoice marked `PAID` with `SUCCESS` payment.
  - **Semester 2 (IN PROGRESS)**:
    - `SemesterEnrollment.status = IN_PROGRESS`.
    - Enrolled in Semester 2 courses.
    - **Edge-case testing**: Exactly 1 course enrollment deliberately marked `DROPPED` (`Arif Rahman` in `CSE203`).
    - Ongoing recent attendance records.
    - Midterm exam `PUBLISHED` (scheduled and ungraded) & Final exam `DRAFT`.
    - **Mixed Payment States**: 12 paid, 1 failed payment attempt (`Taslima Begum`), 7 pending.
- **Sample Refresh Token**: Valid session for Admin ready for Postman token refresh testing.

---

## 10. Local Setup & Execution Guide

### 10.1 Environment Configuration (`.env`)

```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/university_db?schema=public"

JWT_ACCESS_SECRET="your-jwt-access-secret-key-at-least-32-chars"
JWT_ACCESS_EXPIRES_IN="1d"
JWT_REFRESH_SECRET="your-jwt-refresh-secret-key-at-least-32-chars"
JWT_REFRESH_EXPIRES_IN="30d"
BCRYPT_SALT_ROUNDS=10

# Payment Gateways (Live or Sandbox keys)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
BKASH_APP_KEY="..."
BKASH_APP_SECRET="..."
BKASH_USERNAME="..."
BKASH_PASSWORD="..."
SSLCOMMERZ_STORE_ID="..."
SSLCOMMERZ_STORE_PASSWORD="..."
SSLCOMMERZ_IS_LIVE=false

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:5000/api/v1/auth/google/callback"
```

### 10.2 Database Migration & Seeding

```bash
# 1. Format and validate multi-file Prisma schema
npx prisma format --schema=./prisma/schema
npx prisma validate --schema=./prisma/schema

# 2. Run migrations
npx prisma migrate dev --schema=./prisma/schema --name init

# 3. Generate Prisma client
npx prisma generate --schema=./prisma/schema

# 4. Seed database (FK-safe, idempotent)
npx ts-node seed.ts
```

### 10.3 Testing in Postman

1. Import [University-Management-System.postman_collection.json](file:///c:/Users/abulb/Downloads/UMS-Schema-Update/University-Management-System.postman_collection.json) into Postman.
2. Confirm `baseUrl` is set to `http://localhost:5000/api/v1`.
3. Run **1.Auth > Login - Admin** — all collection tokens (`accessToken`, `refreshToken`, `userId`) auto-populate.
4. Execute any administrative or student endpoints sequentially; create requests auto-capture resource IDs (`programSemesterId`, `semesterCourseId`, `semesterEnrollmentId`, `invoiceId`, etc.) for subsequent calls.
