# Prisma Schema (Multi-File)

Uses Prisma's **multi-file schema** feature (`previewFeatures = ["prismaSchemaFolder"]`,
stable in Prisma 6+). All `.prisma` files in this folder compile together as a single schema.

## File map

| File                           | Contents                                                        |
| ------------------------------ | --------------------------------------------------------------- |
| `schema.prisma`                | `generator` + `datasource` config (entry point)                 |
| `enums.prisma`                 | All shared enums (`Role`, `DegreeType`, statuses, grades, etc.) |
| `user.prisma`                  | `User`, `RefreshToken`                                          |
| `profiles.prisma`              | `StudentProfile`, `FacultyProfile`                              |
| `academic-structure.prisma`    | `Department`, `Program`, `Course`                               |
| `program-semesters.prisma`     | `ProgramSemester`, `SemesterCourse` — the curriculum layer      |
| `enrollment-attendance.prisma` | `SemesterEnrollment`, `CourseEnrollment`, `Attendance`          |
| `exams-results.prisma`         | `Exam`, `Result`                                                |
| `finance.prisma`               | `FeeInvoice`, `Payment`                                         |
| `notifications-audit.prisma`   | `Notification`, `AuditLog`                                      |

## What changed from the previous version

- **`Section` and `SectionFaculty` are gone.** There's no separate "offering" layer anymore.
- **`Semester` is no longer a shared calendar term.** It's replaced by `ProgramSemester` — a
  numbered slot (1, 2, 3…) that belongs to exactly one `Program`. Every program has its own
  independent sequence of semesters, sized by `Program.degreeType`:
  - `BSC` → 8 semesters
  - `MSC` → 4 semesters
  - `PHD` → 6 semesters
- **`SemesterCourse`** replaces `Section`: it places one `Course` into one `ProgramSemester` and
  assigns the single `FacultyProfile` who teaches it. One course, one teacher, per program semester
  — no capacity/multiple-sections concept.
- **`CoursePrerequisite` is gone.** Progression is now gated at the semester level instead of the
  individual-course level: a student's `SemesterEnrollment` for semester N-1 must be `COMPLETED`
  before they can start semester N (service-layer rule; semester 1 has no prior semester to satisfy).
- **Two enrollment layers:**
  - `SemesterEnrollment` — a student's progress through one `ProgramSemester` as a whole (status,
    dates, semester GPA). The per-semester fee invoice hangs off this.
  - `CourseEnrollment` — a student taking one specific `SemesterCourse` within that semester.
    Attendance and `Result` records attach here.
- **`FeeInvoice.type`** distinguishes the one-time `ADMISSION` fee (linked via `programId`) from the
  recurring `SEMESTER` fee (linked via `semesterEnrollmentId`).
- **Read-only for students, by design:** `Attendance` and `Result` are only ever written by
  `markedById` / `enteredById` (a faculty member's user id) — the API layer (not the schema) is
  responsible for rejecting any student attempt to write to these tables.

## Usage

Place this folder at `prisma/schema/` in your project root, then run the usual commands pointed
at the folder:

```bash
npx prisma format --schema=./prisma/schema
npx prisma validate --schema=./prisma/schema
npx prisma migrate dev --schema=./prisma/schema --name init
npx prisma generate --schema=./prisma/schema
```

Requires **Prisma >= 5.15** (stable by default in Prisma 6+ — remove `previewFeatures` from
`schema.prisma` if you're on 6+).
