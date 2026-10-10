# Working Flows — Student / Faculty / Admin

## STUDENT

1. **Register/Login** → verify email → submit a student role application with an active program selection.
2. **Admin approval** → account becomes a student and receives a student profile linked to that program.
3. **View curriculum** — see the program's full semester list and each semester's courses (`GET /programs/:id/semesters`) up front.
4. **Request Semester 1 enrollment** → the system creates the admission invoice (`FeeInvoice.type=ADMISSION`) if needed; pay it, then retry enrollment.
5. **Pay the semester fee** → retry enrollment; the system activates the semester and auto-creates a `CourseEnrollment` for each assigned course.
6. Through the semester: **view** class schedule, **view (read-only)** attendance marked by faculty, **view (read-only)** exams and — once published — **results**.
7. **Semester ends** → publishing all final course results automatically calculates GPA and completes the semester.
8. **Next semester unlocks** only after the previous one is `COMPLETED` → repeat step 5.
9. Anytime: **view transcript** (all completed semesters + cumulative GPA), **view/pay invoices**, **view notifications**.

Student can never write attendance, exams, or results — view only.

---

## FACULTY

1. **Login** → manage own profile.
2. **View assigned courses** (`SemesterCourse` rows where `teacherId` = self) — admin assigns these, faculty doesn't self-select.
3. Per assigned course: **view enrolled students** (`CourseEnrollment` list).
4. **Mark attendance** per class date (blocked for sections/courses not assigned to them; duplicate student+date rejected).
5. **Create exams** (quiz/midterm/final/etc.) for their course.
6. **Enter marks** → system validates `0 ≤ marks ≤ totalMarks` → grade auto-calculated.
7. **Submit and publish results** for assigned courses → results become visible to students; admins can also publish.
8. Faculty can edit their own entries until published; cannot touch other faculty's courses.

---

## ADMIN

1. **Login.**
2. **Set up structure**: create Departments → Programs (pick `degreeType`, which auto-generates 8/4/6 `ProgramSemester` slots) → Courses.
3. **Build curriculum**: for each `ProgramSemester`, add `SemesterCourse` entries (course + assign one teacher).
4. **Manage users**: review role applications; approval changes the account role and creates its student/faculty profile. Activate/suspend accounts.
5. **Finance**: admission fee and semester fee are set on the `Program`; the enrollment workflow creates invoices, while the admin monitors payments (real gateway, never marked paid manually).
6. **Oversight**: review and publish results, view dashboard analytics, audit logs, and reports.
7. Admin has full read/write across every entity — the only role that can change structure (departments/programs/courses/curriculum) or fees.
