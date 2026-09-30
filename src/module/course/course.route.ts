import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { CourseController } from "./course.controller.js";
import { CourseListValidation, CourseValidation } from "./course.validation.js";

const router = Router();

router.get(
  "/",
  auth(Role.ADMIN, Role.FACULTY, Role.STUDENT),
  validateRequest(CourseListValidation),
  CourseController.courseList,
);

router.get(
  "/:id",
  auth(Role.ADMIN, Role.FACULTY, Role.STUDENT),
  CourseController.getSingleCourse,
);

router.post(
  "/",
  auth(Role.ADMIN),
  validateRequest(CourseValidation),
  CourseController.createNewCourse,
);

router.patch(
  "/:id",
  auth(Role.ADMIN),
  validateRequest(CourseValidation.partial()),
  CourseController.updateCourse,
);

router.delete("/:id", auth(Role.ADMIN), CourseController.removeCourse);

export const CourseRoutes = router;
