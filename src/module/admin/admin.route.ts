import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { AdminController } from "./admin.controller.js";
import { updateUserStatusSchema } from "./admin.validation.js";

const router = Router();

router.patch(
  "/users/:targetUserId/status",
  auth(Role.ADMIN),
  validateRequest(updateUserStatusSchema),
  AdminController.updateUserStatus,
);

router.get(
  "/dashboard/stats",
  auth(Role.ADMIN),
  AdminController.getDashboardStats,
);

export const AdminRoutes = router;
