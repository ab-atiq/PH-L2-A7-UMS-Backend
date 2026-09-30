import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { ResultController } from "./result.controller.js";
import { ResultListValidation, ResultValidation } from "./result.validation.js";
const router = Router();
router.get(
  "/",
  auth(Role.ADMIN, Role.FACULTY, Role.STUDENT),
  validateRequest(ResultListValidation),
  ResultController.list,
);
router.post(
  "/",
  auth(Role.ADMIN, Role.FACULTY),
  validateRequest(ResultValidation),
  ResultController.submit,
);
router.post("/:id/publish", auth(Role.ADMIN), ResultController.publish);
export const ResultRoutes = router;
