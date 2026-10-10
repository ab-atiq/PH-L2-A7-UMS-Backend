import type { Request } from "express";
import httpStatus from "http-status";
import config from "../../config/index.js";
import { AppError } from "../../utils/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { PaymentService } from "./payment.service.js";

const currentUser = (req: Request) => {
  if (!req.user)
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required");
  return req.user;
};

const initiate = catchAsync(async (req, res) =>
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Payment session created",
    data: await PaymentService.initiate(currentUser(req).userId, req.body),
  }),
);

const webhook = catchAsync(async (req, res) =>
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment webhook processed",
    data: await PaymentService.processWebhook(
      req.body,
      req.header("x-gateway-signature") || undefined,
    ),
  }),
);

const checkout = catchAsync(async (req, res) => {
  const result = await PaymentService.createCheckoutSession(
    currentUser(req).userId,
    req.query.invoiceId as string,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Checkout session created successfully",
    data: result,
  });
});

const bkash = catchAsync(async (req, res) => {
  const result = await PaymentService.createBkashPayment(
    currentUser(req).userId,
    req.body.invoiceId,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "bKash payment initiated successfully",
    data: result,
  });
});

const bkashCallback = catchAsync(async (req, res) => {
  const result = await PaymentService.handleBkashCallback(req.query);
  res.redirect(result.redirectUrl);
});

const checkoutSuccess = catchAsync(async (req, res) => {
  const sessionId = req.query.session_id as string | undefined;
  if (!sessionId)
    throw new AppError(httpStatus.BAD_REQUEST, "Missing Stripe session id");
  const payment = await PaymentService.completeCheckout(sessionId);
  return res.redirect(
    `${config.frontend_url}/payment-result?paymentId=${encodeURIComponent(payment.id)}`,
  );
});

const checkoutCancel = catchAsync(async (req, res) => {
  const sessionId = req.query.session_id as string | undefined;
  if (!sessionId)
    throw new AppError(httpStatus.BAD_REQUEST, "Missing Stripe session id");
  const payment = await PaymentService.cancelCheckout(sessionId);
  return res.redirect(
    `${config.frontend_url}/payment-result?paymentId=${encodeURIComponent(payment.id)}`,
  );
});

const getById = catchAsync(async (req, res) => {
  const user = currentUser(req);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment fetched successfully",
    data: await PaymentService.getById(
      user.userId,
      user.role,
      String(req.params.id),
    ),
  });
});

export const PaymentController = {
  initiate,
  webhook,
  checkout,
  bkash,
  bkashCallback,
  checkoutSuccess,
  checkoutCancel,
  getById,
};
