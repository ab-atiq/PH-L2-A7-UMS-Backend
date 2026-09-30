# University Management System — Project Requirements

## 1. Overview

A production-quality **University Management System (UMS)** backend built as a backend-focused engineering assignment. The system digitizes core university academic operations across the full academic lifecycle:

```
University → Department → Program → Course → Semester → Course Registration
           → Attendance → Exam → Result → Transcript / GPA
```

The system also handles university fee invoicing and real payment gateway integration.

---

## 2. Mandatory Technology Stack

| Concern                    | Technology                                                        |
| -------------------------- | ----------------------------------------------------------------- |
| Runtime                    | Node.js + TypeScript                                              |
| Framework                  | Express.js                                                        |
| Database                   | PostgreSQL                                                        |
| ORM                        | Prisma                                                            |
| Validation                 | Zod                                                               |
| Authentication             | JWT Bearer Token (Access + Refresh)                               |
| Social Auth                | Google / GCP OAuth                                                |
| Password Hashing           | bcrypt                                                            |
| API Versioning             | `/api/v1`                                                         |
| API Docs                   | Swagger / OpenAPI + Postman Collection                            |
| Security                   | Helmet, CORS, express-rate-limit                                  |
| Payments                   | Stripe, bKash, or SSLCommerz (real integration, no mocked status) |
| Caching / Rate Limit Store | Redis (optional but recommended)                                  |
| Deployment                 | Render / Vercel ready                                             |

**Non-negotiables:** minimum 20 meaningful APIs, soft delete, audit logs, pagination, filtering, sorting, search, database indexes, Prisma transactions, strict RBAC, consistent success/error response envelope, clean modular architecture, secrets via environment variables.

---

## 3. Roles (Exactly 3 — No More)

1. **STUDENT** — academic self-service
2. **FACULTY** — teaching + attendance + exams + results
3. **ADMIN** — university-wide management, finance, reporting

No separate Registrar / Finance Admin / Department Admin / Super Admin roles. All administrative operations are permission-gated under **ADMIN** via RBAC middleware — not new roles.

### 3.1 Role Responsibility Matrix

| Capability                                                                    |   STUDENT   |         FACULTY          |       ADMIN        |
| ----------------------------------------------------------------------------- | :---------: | :----------------------: | :----------------: |
| Register / Login (incl. Google)                                               |     ✅      |      — (login only)      |         —          |
| View/update own profile                                                       |     ✅      |            ✅            |         —          |
| View departments/programs                                                     |     ✅      |            —             |     ✅ manage      |
| View courses, details, prerequisites, sections                                |     ✅      |            —             |     ✅ manage      |
| Register / drop courses                                                       |     ✅      |            —             |         —          |
| View enrollments, schedule                                                    |     ✅      |      ✅ (assigned)       |         —          |
| View attendance                                                               |  ✅ (own)   | ✅ manage (own sections) |         —          |
| View/manage exams                                                             |  ✅ (view)  |        ✅ manage         |         —          |
| Enter/update marks, publish results                                           |      —      |     ✅ enter/update      |     ✅ publish     |
| View results/GPA/transcript                                                   |     ✅      |    course performance    |      reports       |
| Fee invoices & payments                                                       | ✅ view/pay |            —             | ✅ create/view all |
| Notifications                                                                 |     ✅      |            ✅            |     ✅ manage      |
| Users, faculty, students, departments, programs, courses, semesters, sections |      —      |            —             |    ✅ full CRUD    |
| Assign faculty to sections                                                    |      —      |            —             |         ✅         |
| Publish/unpublish courses                                                     |      —      |            —             |         ✅         |
| Audit logs, system analytics, dashboard stats                                 |      —      |            —             |         ✅         |

---

## 4. Core Business Workflows

### Workflow 1 — Student Registration

Register → Email verification → Login → Complete profile → Select program → Student dashboard.

### Workflow 2 — Course Registration (Prisma Transaction Required)

Select semester → Browse courses → View details → Check prerequisites → Check credit limit → Check duplicate enrollment → Select section → Register → **transaction validates everything** → Enrollment created → Confirmation.

**Must prevent:**

- Missing prerequisite
- Duplicate enrollment
- Registration outside the registration period
- Exceeding credit limit
- Inactive course / inactive semester
- Full section (capacity exceeded)
- Re-registration for an already completed course

### Workflow 3 — Faculty Assignment

Admin creates section → selects course → selects semester → sets capacity → assigns faculty → publishes section.

### Workflow 4 — Attendance

Faculty opens assigned section → views enrolled students → selects class date → marks attendance → saves.

**Must prevent:**

- Faculty marking attendance for a section they are not assigned to
- Duplicate attendance record for the same student/date/section

### Workflow 5 — Exam

Faculty creates exam → selects section → selects exam type → sets date → sets total marks → publishes exam.

### Workflow 6 — Result

Faculty opens exam → views enrolled students → enters marks → system validates marks → calculates grade → saves result → submits.
Admin reviews → publishes results.
Student views **published** results only.

**Must prevent:** students viewing unpublished results.

### Workflow 7 — GPA

- Semester GPA
- Cumulative GPA
- Total attempted / earned credits
  Calculated from course credits × grade points — derive rather than blindly store where safely possible.

### Workflow 8 — Transcript

Student requests transcript → system retrieves published results → groups by semester → calculates GPA per semester and cumulative → returns transcript.

### Workflow 9 — University Fee Payment (Real Gateway Integration)

Admin creates invoice → Student views invoice → clicks Pay → backend creates payment session → redirect/payment response → gateway callback/webhook → verify payment → update payment status → mark invoice paid → create audit record → notify student.

No fake/mocked payment status endpoints permitted.

---

## 5. Database Entities (Minimum Set)

`User`, `StudentProfile`, `FacultyProfile`, `Department`, `Program`, `Course`, `CoursePrerequisite`, `Semester`, `Section`, `SectionFaculty`, `Enrollment`, `Attendance`, `Exam`, `Result`, `FeeInvoice`, `Payment`, `Notification`, `AuditLog`, `RefreshToken`.

Additional supporting entities may be added only if genuinely necessary.

### 5.1 Key Relationships

- Department → many Programs, many Courses
- Program → belongs to Department, has many Students
- Course → belongs to Department, many Prerequisites, many Sections
- Semester → has many Sections
- Section → belongs to Course + Semester, has many Enrollments, has faculty assignment(s)
- Student → many Enrollments, Attendance records, Results
- Exam → belongs to Section
- Result → belongs to Student + Exam
- Student → many FeeInvoices
- FeeInvoice → has Payment records
- User → has AuditLogs

### 5.2 Database Requirements

- Proper foreign keys, unique and composite-unique constraints
- Indexes on: `email`, `studentId`, `employeeId`, `courseCode`, `departmentId`, `programId`, `semesterId`, `sectionId`, `status`, `createdAt`
- `createdAt`, `updatedAt` on all entities; `deletedAt` for soft-deletable entities
- Enum status fields where appropriate
- Soft deletion (not physical delete) for important entities

---

## 6. API Response Contract

**Success:**

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

**Error:**

```json
{
  "success": false,
  "message": "Something went wrong",
  "errors": []
}
```

This shape must never vary across endpoints.

---

## 7. API Route Groups

```
/api/v1/auth
/api/v1/users
/api/v1/students
/api/v1/faculty
/api/v1/departments
/api/v1/programs
/api/v1/courses
/api/v1/semesters
/api/v1/sections
/api/v1/enrollments
/api/v1/attendance
/api/v1/exams
/api/v1/results
/api/v1/transcripts
/api/v1/invoices
/api/v1/payments
/api/v1/notifications
/api/v1/admin
/api/v1/audit-logs
```

## 8. Minimum API Set (≥20 Endpoints)

**Auth**

```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh-token
POST   /api/v1/auth/logout
GET    /api/v1/auth/google
GET    /api/v1/auth/google/callback
```

**Profile**

```
GET    /api/v1/users/me
PATCH  /api/v1/users/me
```

**Departments**

```
POST   /api/v1/departments
GET    /api/v1/departments
GET    /api/v1/departments/:id
PATCH  /api/v1/departments/:id
DELETE /api/v1/departments/:id
```

**Programs**

```
POST   /api/v1/programs
GET    /api/v1/programs
GET    /api/v1/programs/:id
PATCH  /api/v1/programs/:id
DELETE /api/v1/programs/:id
```

**Courses**

```
POST   /api/v1/courses
GET    /api/v1/courses
GET    /api/v1/courses/:id
PATCH  /api/v1/courses/:id
DELETE /api/v1/courses/:id
GET    /api/v1/courses/search?q=
```

**Prerequisites**

```
POST   /api/v1/courses/:id/prerequisites
GET    /api/v1/courses/:id/prerequisites
DELETE /api/v1/courses/:id/prerequisites/:prerequisiteId
```

**Semesters**

```
POST   /api/v1/semesters
GET    /api/v1/semesters
GET    /api/v1/semesters/current
PATCH  /api/v1/semesters/:id
```

**Sections**

```
POST   /api/v1/sections
GET    /api/v1/sections
GET    /api/v1/sections/:id
PATCH  /api/v1/sections/:id
DELETE /api/v1/sections/:id
POST   /api/v1/sections/:id/assign-faculty
GET    /api/v1/faculty/my-sections
```

**Enrollments**

```
POST   /api/v1/enrollments
GET    /api/v1/enrollments/my
GET    /api/v1/enrollments/:id
DELETE /api/v1/enrollments/:id
```

**Attendance**

```
POST   /api/v1/attendance
GET    /api/v1/attendance/my
GET    /api/v1/sections/:id/attendance
PATCH  /api/v1/attendance/:id
```

**Exams**

```
POST   /api/v1/exams
GET    /api/v1/exams
GET    /api/v1/exams/:id
PATCH  /api/v1/exams/:id
```

**Results**

```
POST   /api/v1/results
PATCH  /api/v1/results/:id
GET    /api/v1/results/my
GET    /api/v1/exams/:id/results
POST   /api/v1/exams/:id/publish-results
```

**Transcript**

```
GET    /api/v1/transcripts/my
```

**Finance**

```
POST   /api/v1/invoices
GET    /api/v1/invoices/my
GET    /api/v1/invoices/:id
```

**Payments**

```
POST   /api/v1/payments/initiate
POST   /api/v1/payments/webhook
GET    /api/v1/payments/:id
```

**Notifications**

```
GET    /api/v1/notifications
PATCH  /api/v1/notifications/:id/read
```

**Admin**

```
GET    /api/v1/admin/dashboard-stats
GET    /api/v1/admin/users
PATCH  /api/v1/admin/users/:id/status
GET    /api/v1/admin/audit-logs
```

---

## 9. Query Features (Major List Endpoints)

Support:

```
?page=1&limit=10&search=&status=&sortBy=&sortOrder=
```

Return pagination metadata:

```json
{
  "page": 1,
  "limit": 10,
  "total": 100,
  "totalPages": 10
}
```

---

## 10. Architecture — Folder Structure

```
src/
  app.ts
  server.ts
  config/
  modules/
    auth/
    users/
    students/
    faculty/
    departments/
    programs/
    courses/
    semesters/
    sections/
    enrollments/
    attendance/
    exams/
    results/
    transcripts/
    invoices/
    payments/
    notifications/
    admin/
    auditLogs/
  middlewares/
    auth.middleware.ts
    role.middleware.ts
    validation.middleware.ts
    error.middleware.ts
    rateLimit.middleware.ts
  utils/
  lib/
  types/
  constants/
```

Each module contains: `route`, `controller`, `service`, `validation`, `types`.
Controllers stay thin; business logic lives in services; DB access goes through Prisma cleanly.

---

## 11. Security Requirements

- bcrypt password hashing
- JWT access token + refresh token, secure handling, Bearer auth
- Strict RBAC middleware
- Helmet, CORS, express-rate-limit
- Input validation via Zod on all mutating endpoints
- Sanitized error responses (no stack traces / secret leakage)
- Environment variables for all secrets
- Secure payment webhook signature verification

---

## 12. Audit Logging

Track: login, registration, role changes, course creation/update, enrollment, enrollment cancellation, attendance modification, result creation, result publication, invoice creation, payment status update, admin actions.

Each `AuditLog` record stores: `actor`, `action`, `entity`, `entityId`, `metadata`, `timestamp`.

---

## 13. Error Handling

Centralized error middleware handling:

- Zod validation errors
- Prisma errors (unique constraint, not found, FK violations)
- Authentication errors
- Authorization errors
- Not found
- Duplicate records
- Business rule violations
- Payment errors
- Unknown/unhandled errors

Use appropriate HTTP status codes throughout; error format must always match the standard envelope.

---

## 14. Testing Strategy

Critical business logic to cover with tests:

- Duplicate enrollment prevention
- Prerequisite failure
- Credit limit enforcement
- Section capacity enforcement
- Unauthorized faculty access to a section
- Unpublished results hidden from students
- Invalid marks rejected
- Duplicate attendance prevention
- Payment verification (webhook signature + status transition)
- Role-based access restrictions

---

## 15. Seed Data

- 1 Admin
- 5 Faculty
- 20 Students
- 3 Departments
- 3 Programs
- 20 Courses
- 2 Semesters
- Multiple Sections
- Enrollments, Attendance, Exams, Results, Invoices

Include demo credentials for evaluation. Never hardcode production secrets.

---

## 16. Documentation Deliverables

- `README.md`
- API documentation (Swagger/OpenAPI)
- Postman collection
- `.env.example`
- Database setup, migration, and seed instructions
- Local development instructions
- Deployment instructions (Render/Vercel)
- Architecture diagram explanation
- ERD explanation
- Role permission matrix
- API endpoint table
- Business rules
- Payment flow
- Authentication flow

---

## 17. Git Workflow

Develop through meaningful, atomic commits (minimum 20) using conventional prefixes:
`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`

---

## 18. Delivery Plan

Before implementation, produce:

1. Complete architecture
2. Role permission matrix
3. Database ERD description
4. Prisma model design
5. API specification
6. Business rules
7. Folder structure
8. Authentication architecture
9. Payment architecture
10. Testing strategy

Then implement the project step by step.

**Guiding principle:** do not add features merely to inflate scope. Prioritize correctness, relational database design, sound business logic, transactional integrity, security, and maintainability over feature count.
