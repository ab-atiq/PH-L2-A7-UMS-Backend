import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { NotificationController } from "./notification.controller.js";
import {
  createNotificationSchema,
  notificationListSchema,
} from "./notification.validation.js";

const router = Router();
router.get(
  "/",
  auth(Role.ADMIN, Role.FACULTY, Role.STUDENT),
  validateRequest(notificationListSchema),
  NotificationController.listMine,
);
router.post(
  "/",
  auth(Role.ADMIN),
  validateRequest(createNotificationSchema),
  NotificationController.create,
);
router.patch(
  "/:id/read",
  auth(Role.ADMIN, Role.FACULTY, Role.STUDENT),
  NotificationController.markRead,
);
export const NotificationRoutes = router;
