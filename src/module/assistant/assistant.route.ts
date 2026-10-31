import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { AssistantController } from "./assistant.controller.js";
import { AssistantChatValidation } from "./assistant.validation.js";

const router = Router();

router.post(
  "/chat",
  auth(Role.STUDENT),
  validateRequest(AssistantChatValidation),
  AssistantController.chat,
);
router.get(
  "/recommendations",
  auth(Role.STUDENT),
  AssistantController.recommendations,
);

export const AssistantRoutes = router;
