import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { ProgramController } from "./program.controller.js";
import {
  ProgramListValidation,
  ProgramValidation,
} from "./program.validation.js";

const router = Router();

router.get(
  "/",
  auth(Role.ADMIN, Role.FACULTY, Role.STUDENT),
  validateRequest(ProgramListValidation),
  ProgramController.programList,
);

router.get(
  "/:id",
  auth(Role.ADMIN, Role.FACULTY, Role.STUDENT),
  ProgramController.getSingleProgram,
);

router.post(
  "/",
  auth(Role.ADMIN),
  validateRequest(ProgramValidation),
  ProgramController.createNewProgram,
);

router.patch(
  "/:id",
  auth(Role.ADMIN),
  validateRequest(ProgramValidation.partial()),
  ProgramController.updateProgram,
);

router.delete("/:id", auth(Role.ADMIN), ProgramController.removeProgram);

export const ProgramRoutes = router;
