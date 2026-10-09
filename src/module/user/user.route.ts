import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { upload } from "../../lib/multer";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { UserController } from "./user.controller";
import {
  AdminUserListValidation,
  AdminUserStatusValidation,
  AdminUserUpdateValidation,
  UpdateMyProfileSchema,
} from "./user.validation";

const router = Router();

router.get(
  "/",
  auth(Role.ADMIN),
  validateRequest(AdminUserListValidation),
  UserController.listUsersByAdmin,
);

router.get(
  "/me",
  auth(Role.ADMIN, Role.FACULTY, Role.STUDENT, Role.USER),
  UserController.getMyProfile,
);

router.patch(
  "/me",
  auth(Role.ADMIN, Role.FACULTY, Role.STUDENT, Role.USER),
  validateRequest(UpdateMyProfileSchema),
  UserController.updateMyProfile,
);

router.patch(
  "/profile-image",
  auth(Role.ADMIN, Role.FACULTY, Role.STUDENT, Role.USER),
  upload.single("profileImage"),
  UserController.uploadProfileImage,
);

router.patch(
  "/:id/status",
  auth(Role.ADMIN),
  validateRequest(AdminUserStatusValidation),
  UserController.updateUserStatusByAdmin,
);
router.get("/:id", auth(Role.ADMIN), UserController.getUserByAdmin);
router.patch(
  "/:id",
  auth(Role.ADMIN),
  validateRequest(AdminUserUpdateValidation),
  UserController.updateUserByAdmin,
);
router.delete("/:id", auth(Role.ADMIN), UserController.deleteUserByAdmin);

export const UserRoutes = router;
