import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { PaymentController } from "./payment.controller.js";
import {
  bkashPaymentSchema,
  checkoutQuerySchema,
  initiatePaymentSchema,
  webhookSchema,
} from "./payment.validation.js";

const router = Router();
router.post(
  "/bkash",
  auth(Role.STUDENT),
  validateRequest(bkashPaymentSchema),
  PaymentController.bkash,
);
router.get("/bkash/callback", PaymentController.bkashCallback);

router.post(
  "/initiate",
  auth(Role.STUDENT),
  validateRequest(initiatePaymentSchema),
  PaymentController.initiate,
);

router.post(
  "/webhook",
  validateRequest(webhookSchema),
  PaymentController.webhook,
);

router.get(
  "/checkout",
  auth(Role.STUDENT),
  validateRequest(checkoutQuerySchema, "query"),
  PaymentController.checkout,
);
router.get("/success", PaymentController.checkoutSuccess);
router.get("/cancel", PaymentController.checkoutCancel);

router.get("/:id", auth(Role.ADMIN, Role.STUDENT), PaymentController.getById);

export const PaymentRoutes = router;
