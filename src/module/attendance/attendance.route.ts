import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { AttendanceController } from "./attendance.controller.js";
import { AttendanceValidation } from "./attendance.validation.js";

const router = Router();

router.get(
  "/section/:sectionId",
  auth(Role.ADMIN, Role.FACULTY, Role.STUDENT),
  AttendanceController.list,
);

router.post(
  "/section/:sectionId",
  auth(Role.ADMIN, Role.FACULTY),
  validateRequest(AttendanceValidation),
  AttendanceController.create,
);

router.patch(
  "/:id",
  auth(Role.ADMIN, Role.FACULTY),
  validateRequest(AttendanceValidation.partial()),
  AttendanceController.update,
);

export const AttendanceRoutes = router;
