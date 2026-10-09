# Working Flows — Student / Faculty / Admin

## STUDENT

1. **Register/Login** → verify email → complete profile.
2. **Choose a Program** → pay one-time **admission fee** (`FeeInvoice.type=ADMISSION`) → `SemesterEnrollment` for Semester 1 becomes available.
3. **View curriculum** — see the program's full semester list and each semester's courses (`GET /programs/:id/semesters`) up front.
4. **Enroll in current semester** → pay the flat **semester fee** → system auto-creates a `CourseEnrollment` for every course in that semester.
5. Through the semester: **view** class schedule, **view (read-only)** attendance marked by faculty, **view (read-only)** exams and — once published — **results**.
6. **Semester ends** → once all results are published, `SemesterEnrollment.status → COMPLETED`, GPA calculated.
7. **Next semester unlocks** only after the previous one is `COMPLETED` → repeat step 4.
8. Anytime: **view transcript** (all completed semesters + cumulative GPA), **view/pay invoices**, **view notifications**.

Student can never write attendance, exams, or results — view only.

---

## FACULTY

1. **Login** → manage own profile.
2. **View assigned courses** (`SemesterCourse` rows where `teacherId` = self) — admin assigns these, faculty doesn't self-select.
3. Per assigned course: **view enrolled students** (`CourseEnrollment` list).
4. **Mark attendance** per class date (blocked for sections/courses not assigned to them; duplicate student+date rejected).
5. **Create exams** (quiz/midterm/final/etc.) for their course.
6. **Enter marks** → system validates `0 ≤ marks ≤ totalMarks` → grade auto-calculated.
7. **Submit results** → Admin reviews → **publishes** → now visible to students.
8. Faculty can edit their own entries until published; cannot touch other faculty's courses.

---

## ADMIN

1. **Login.**
2. **Set up structure**: create Departments → Programs (pick `degreeType`, which auto-generates 8/4/6 `ProgramSemester` slots) → Courses.
3. **Build curriculum**: for each `ProgramSemester`, add `SemesterCourse` entries (course + assign one teacher).
4. **Manage users**: create/update Students, Faculty; activate/suspend accounts.
5. **Finance**: admission fee and semester fee are set on the `Program`; admin creates/reviews invoices, monitors payments (real gateway, never marked paid manually).
6. **Oversight**: review and publish results, view dashboard analytics, audit logs, and reports.
7. Admin has full read/write across every entity — the only role that can change structure (departments/programs/courses/curriculum) or fees.
