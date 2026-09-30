import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { upload } from "../../lib/multer";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { UserController } from "./user.controller";
import { UpdateMyProfileSchema } from "./user.validation";

const router = Router();

router.get(
  "/me",
  auth(Role.ADMIN, Role.FACULTY, Role.STUDENT),
  UserController.getMyProfile,
);

router.patch(
  "/me",
  auth(Role.ADMIN, Role.FACULTY, Role.STUDENT),
  validateRequest(UpdateMyProfileSchema),
  UserController.updateMyProfile,
);

router.patch(
  "/profile-image",
  auth(Role.ADMIN, Role.FACULTY, Role.STUDENT),
  upload.single("profileImage"),
  UserController.uploadProfileImage,
);

export const UserRoutes = router;
