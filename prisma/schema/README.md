# Prisma Schema (Multi-File)

This uses Prisma's **multi-file schema** feature (`previewFeatures = ["prismaSchemaFolder"]`,
stable in Prisma 6+). All `.prisma` files in this folder are compiled together as a single
schema — models and enums can reference each other across files with no extra config.

## File map

| File | Contents |
|---|---|
| `schema.prisma` | `generator` + `datasource` config (entry point) |
| `enums.prisma` | All shared enums (`Role`, statuses, grades, etc.) |
| `user.prisma` | `User`, `RefreshToken` |
| `profiles.prisma` | `StudentProfile`, `FacultyProfile` |
| `academic-structure.prisma` | `Department`, `Program`, `Course`, `CoursePrerequisite`, `Semester` |
| `sections.prisma` | `Section`, `SectionFaculty` |
| `enrollment-attendance.prisma` | `Enrollment`, `Attendance` |
| `exams-results.prisma` | `Exam`, `Result` |
| `finance.prisma` | `FeeInvoice`, `Payment` |
| `notifications-audit.prisma` | `Notification`, `AuditLog` |

## Usage

Place this `schema/` folder at `prisma/schema/` in your project root (Prisma's default
multi-file location), or point Prisma at it explicitly:

```bash
# package.json
"prisma": {
  "schema": "prisma/schema"
}
```

Then run the usual commands, pointed at the folder:

```bash
npx prisma format --schema=./prisma/schema
npx prisma validate --schema=./prisma/schema
npx prisma migrate dev --schema=./prisma/schema --name init
npx prisma generate --schema=./prisma/schema
```

Requires **Prisma >= 5.15** (the feature is stable by default in Prisma 6+, no preview
flag needed — remove `previewFeatures` from `schema.prisma` if you're on 6+).
