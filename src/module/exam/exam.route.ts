import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { ExamController } from "./exam.controller.js";
import { ExamValidation } from "./exam.validation.js";

const router = Router();

router.get(
  "/",
  auth(Role.ADMIN, Role.FACULTY, Role.STUDENT),
  ExamController.list,
);

router.post(
  "/",
  auth(Role.ADMIN, Role.FACULTY),
  validateRequest(ExamValidation),
  ExamController.create,
);

router.patch(
  "/:id",
  auth(Role.ADMIN, Role.FACULTY),
  validateRequest(ExamValidation.partial()),
  ExamController.update,
);

router.post(
  "/:id/publish",
  auth(Role.ADMIN, Role.FACULTY),
  ExamController.publish,
);

export const ExamRoutes = router;
