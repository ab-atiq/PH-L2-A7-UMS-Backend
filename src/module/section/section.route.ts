import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { SectionController } from "./section.controller.js";
import {
  SectionListValidation,
  SectionValidation,
} from "./section.validation.js";

const router = Router();

router.get(
  "/",
  auth(Role.ADMIN, Role.FACULTY, Role.STUDENT),
  validateRequest(SectionListValidation),
  SectionController.sectionList,
);

router.get(
  "/:id",
  auth(Role.ADMIN, Role.FACULTY, Role.STUDENT),
  SectionController.getSingleSection,
);

router.post(
  "/",
  auth(Role.ADMIN),
  validateRequest(SectionValidation),
  SectionController.createSection,
);

router.patch(
  "/:id",
  auth(Role.ADMIN),
  validateRequest(SectionValidation.partial()),
  SectionController.updateSection,
);

router.delete("/:id", auth(Role.ADMIN), SectionController.removeSection);

export const SectionRoutes = router;
