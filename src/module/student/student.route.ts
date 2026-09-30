import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { StudentController } from "./student.controller.js";
import {
  StudentCreateValidation,
  StudentUpdateValidation,
} from "./student.validation.js";

const router = Router();

router.post(
  "/",
  auth(Role.ADMIN),
  validateRequest(StudentCreateValidation),
  StudentController.createStudentProfile,
);

router.get(
  "/:studentId",
  auth(Role.ADMIN, Role.FACULTY, Role.STUDENT),
  StudentController.getStudentProfile,
);

router.patch(
  "/:studentId",
  auth(Role.ADMIN),
  validateRequest(StudentUpdateValidation),
  StudentController.updateStudentProfile,
);

router.delete(
  "/:studentId",
  auth(Role.ADMIN),
  StudentController.deleteStudentProfile,
);

export const StudentRoutes = router;
