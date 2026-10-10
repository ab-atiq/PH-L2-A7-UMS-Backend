import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { SemesterCourseController } from "./semester-course.controller.js";
import {
  SemesterCourseCreateValidation,
  SemesterCourseUpdateValidation,
} from "./semester-course.validation.js";

const router = Router();

router.get(
  "/faculty/my-courses",
  auth(Role.FACULTY),
  SemesterCourseController.myCourses,
);
router.get(
  "/program-semesters/:programSemesterId/courses",
  auth(Role.ADMIN, Role.FACULTY, Role.STUDENT),
  SemesterCourseController.list,
);
router.post(
  "/program-semesters/:programSemesterId/courses",
  auth(Role.ADMIN),
  validateRequest(SemesterCourseCreateValidation),
  SemesterCourseController.create,
);
router.patch(
  "/semester-courses/:id",
  auth(Role.ADMIN),
  validateRequest(SemesterCourseUpdateValidation),
  SemesterCourseController.update,
);
router.delete(
  "/semester-courses/:id",
  auth(Role.ADMIN),
  SemesterCourseController.remove,
);

export const SemesterCourseRoutes = router;
