import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { CoursePrerequisiteController } from "./course-prerequisite.controller.js";
import { CoursePrerequisiteValidation } from "./course-prerequisite.validation.js";

const router = Router();

router.post(
  "/",
  auth(Role.ADMIN),
  validateRequest(CoursePrerequisiteValidation),
  CoursePrerequisiteController.addPrerequisite,
);

router.get(
  "/:courseId",
  auth(Role.ADMIN, Role.FACULTY, Role.STUDENT),
  CoursePrerequisiteController.getPrerequisites,
);

router.delete(
  "/:courseId/:prerequisiteId",
  auth(Role.ADMIN),
  CoursePrerequisiteController.removePrerequisite,
);

export const CoursePrerequisiteRoutes = router;
