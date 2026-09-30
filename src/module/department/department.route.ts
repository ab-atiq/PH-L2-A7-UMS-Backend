import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { DepartmentController } from "./department.controller.js";
import {
  DepartmentListValidation,
  DepartmentValidation,
} from "./department.validation.js";

const router = Router();

router.get(
  "/",
  auth(Role.ADMIN, Role.FACULTY, Role.STUDENT),
  validateRequest(DepartmentListValidation),
  DepartmentController.departmentList,
);

router.get(
  "/:id",
  auth(Role.ADMIN, Role.FACULTY, Role.STUDENT),
  DepartmentController.getSingleDepartment,
);

router.post(
  "/",
  auth(Role.ADMIN),
  validateRequest(DepartmentValidation),
  DepartmentController.createNewDepartment,
);

router.patch(
  "/:id",
  auth(Role.ADMIN),
  validateRequest(DepartmentValidation.partial()),
  DepartmentController.updateDepartment,
);

router.delete("/:id", auth(Role.ADMIN), DepartmentController.removeDepartment);

export const DepartmentRoutes = router;
