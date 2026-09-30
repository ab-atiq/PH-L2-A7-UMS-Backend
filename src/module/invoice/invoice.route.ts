import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { InvoiceController } from "./invoice.controller.js";
import {
  createInvoiceSchema,
  invoiceListSchema,
} from "./invoice.validation.js";

const router = Router();

router.post(
  "/",
  auth(Role.ADMIN),
  validateRequest(createInvoiceSchema),
  InvoiceController.create,
);

router.get(
  "/my",
  auth(Role.STUDENT),
  validateRequest(invoiceListSchema),
  InvoiceController.page,
);

router.get(
  "/",
  auth(Role.ADMIN),
  validateRequest(invoiceListSchema),
  InvoiceController.page,
);

router.get("/:id", auth(Role.ADMIN, Role.STUDENT), InvoiceController.getById);

export const InvoiceRoutes = router;
