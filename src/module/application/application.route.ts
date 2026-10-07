import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { ApplicationController } from "./application.controller.js";
import { CreateRoleApplicationSchema } from "./application.validation.js";

const router = Router();

router.get(
  "/me",
  auth(Role.USER),
  ApplicationController.getMyRoleApplication,
);
router.post(
  "/",
  auth(Role.USER),
  validateRequest(CreateRoleApplicationSchema),
  ApplicationController.createRoleApplication,
);

export const ApplicationRoutes = router;
