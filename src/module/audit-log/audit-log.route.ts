import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { AuditLogController } from "./audit-log.controller.js";
import { auditLogListSchema } from "./audit-log.validation.js";

const router = Router();
router.get(
  "/",
  auth(Role.ADMIN),
  validateRequest(auditLogListSchema),
  AuditLogController.list,
);
export const AuditLogRoutes = router;
