import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { StudentController } from "./student.controller.js";
import {
  StudentCreateValidation,
  StudentSelfProfileValidation,
  StudentListValidation,
  StudentUpdateValidation,
} from "./student.validation.js";

const router = Router();

router.get(
  "/",
  auth(Role.ADMIN),
  validateRequest(StudentListValidation, "query"),
  StudentController.listStudentProfilesByAdmin,
);

router.get("/me", auth(Role.STUDENT), StudentController.getMyStudentProfile);
router.post(
  "/me",
  auth(Role.STUDENT),
  validateRequest(StudentSelfProfileValidation),
  StudentController.createMyStudentProfile,
);
router.patch(
  "/me",
  auth(Role.STUDENT),
  validateRequest(StudentSelfProfileValidation),
  StudentController.updateMyStudentProfile,
);
router.delete(
  "/me",
  auth(Role.STUDENT),
  StudentController.deleteMyStudentProfile,
);

router.post(
  "/",
  auth(Role.ADMIN),
  validateRequest(StudentCreateValidation),
  StudentController.createStudentProfile,
);

router.get(
  "/:studentId",
  auth(Role.ADMIN, Role.FACULTY),
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
