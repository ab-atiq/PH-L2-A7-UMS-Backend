# Schema & Seed Data — Short Reference

## Tables & Why They Exist

| Table | Purpose | Connects To |
|---|---|---|
| `User` | Single login table for all 3 roles | → `StudentProfile`/`FacultyProfile` (1:1), `RefreshToken`, `Notification`, `AuditLog` |
| `RefreshToken` | Long-lived session token, revocable independently of the access token | → `User` |
| `StudentProfile` | Student-only academic data (studentId, guardian, current semester) | → `Program`, `Department`, `ProgramSemester` (current), fans out to enrollments/attendance/results/invoices |
| `FacultyProfile` | Faculty-only data (employeeId, designation) | → `Department`, `SemesterCourse` (as teacher) |
| `Department` | Top of the academic org chart | → `Program`, `Course`, profiles |
| `Program` | A degree (e.g. "B.Sc. in CSE") — carries `degreeType`, `totalSemesters`, `admissionFee`, `semesterFee` | → `Department`, `ProgramSemester`, `StudentProfile`, `FeeInvoice` |
| `Course` | Catalog entry (code, title, credits) — reusable across programs | → `Department`, `SemesterCourse` |
| `ProgramSemester` | **One numbered slot in one program's curriculum** ("Semester 3 of BSc-CSE"). Every program has its own independent sequence, sized by degree type. | → `Program`, `SemesterCourse`, `SemesterEnrollment` |
| `SemesterCourse` | Places one `Course` into one `ProgramSemester` with **one assigned teacher** — replaces the old Section/SectionFaculty entirely | → `ProgramSemester`, `Course`, `FacultyProfile`, `CourseEnrollment`, `Attendance`, `Exam` |
| `SemesterEnrollment` | A student's progress through **one whole ProgramSemester** (status, GPA, completion date). Gates progression: semester N can't start until N-1 is `COMPLETED`. Semester fee invoice hangs here. | → `StudentProfile`, `ProgramSemester`, `CourseEnrollment`, `FeeInvoice` |
| `CourseEnrollment` | A student taking **one `SemesterCourse`** within that semester | → `StudentProfile`, `SemesterCourse`, `SemesterEnrollment`, `Attendance`, `Result` |
| `Attendance` | One row per student/course/class-date. Written by faculty only. | → `CourseEnrollment`, `StudentProfile`, `SemesterCourse` |
| `Exam` | A gradeable event (quiz/midterm/final/etc.) within a `SemesterCourse` | → `SemesterCourse`, `Result` |
| `Result` | One student's marks on one exam. Written by faculty; visible to students only once `PUBLISHED`. | → `Exam`, `StudentProfile`, `CourseEnrollment` |
| `FeeInvoice` | What a student owes — `type` is `ADMISSION` (one-time, linked to `Program`) or `SEMESTER` (recurring, linked to `SemesterEnrollment`) | → `StudentProfile`, `Program`?, `SemesterEnrollment`?, `Payment` |
| `Payment` | One real-gateway payment attempt against an invoice | → `FeeInvoice`, `StudentProfile` |
| `Notification` | In-app messages, read/unread | → `User` |
| `AuditLog` | Append-only trail of who did what | → `User` (actor, optional) |

**Key design shift:** no `Section` and no per-course prerequisites. A program's curriculum is fully fixed and pre-built (`ProgramSemester` → `SemesterCourse`); the only gate is *"finish semester N-1 before starting semester N"*, enforced via `SemesterEnrollment.status`.

---

## Seed Data Summary

| What | Amount |
|---|---|
| Departments | 3 — CSE, EEE, BBA |
| Programs | 5 — BSc-CSE (8 sem, admission ৳5,000), BSc-EEE (8 sem, ৳4,000), BBA-GEN (8 sem, ৳4,000), MSc-CSE (4 sem, ৳6,000), PhD-CSE (6 sem, ৳8,000) — every semester fee is a flat ৳50,000 |
| Courses | 26 — spread one-per-semester (CSE has 2 doubled-up semesters) across each BSc program's 8 semesters |
| ProgramSemester rows | 34 total (8+8+8+4+6) — MSc/PhD have curriculum slots defined but no seeded students |
| Admin | 1 — `admin@university.edu` |
| Faculty | 5 — 2 CSE, 2 EEE, 1 BBA, each assigned as the teacher on their department's `SemesterCourse` rows |
| Students | 20 — cycled across the 3 BSc programs, each with: admission fee paid, Semester 1 fully **completed** (graded, published, paid), Semester 2 **in progress** (attendance ongoing, midterm scheduled/ungraded, mixed payment states — paid/pending/one failed attempt), one deliberately **dropped** course enrollment for edge-case testing |
| Password | `Passw0rd!123` for every seeded account |

Run: `npx prisma migrate dev && npx ts-node prisma/seed.ts` (idempotent — safe to re-run).
