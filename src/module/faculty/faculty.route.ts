import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { FacultyController } from "./faculty.controller.js";
import {
  FacultyCreateValidation,
  FacultyUpdateValidation,
} from "./faculty.validation.js";

const router = Router();

router.get(
  "/",
  auth(Role.ADMIN, Role.FACULTY, Role.STUDENT),
  FacultyController.listFacultySearch,
);

router.get(
  "/filter",
  auth(Role.ADMIN, Role.FACULTY, Role.STUDENT),
  FacultyController.listFacultyFilter,
);

router.get(
  "/:employeeId",
  auth(Role.ADMIN, Role.FACULTY, Role.STUDENT),
  FacultyController.singleFaculty,
);

router.post(
  "/",
  auth(Role.ADMIN),
  validateRequest(FacultyCreateValidation),
  FacultyController.createFacultyProfile,
);

router.patch(
  "/:employeeId",
  auth(Role.ADMIN),
  validateRequest(FacultyUpdateValidation),
  FacultyController.updateFacultyProfile,
);

router.delete(
  "/:employeeId",
  auth(Role.ADMIN),
  FacultyController.deleteFacultyProfile,
);

export const FacultyRoutes = router;
