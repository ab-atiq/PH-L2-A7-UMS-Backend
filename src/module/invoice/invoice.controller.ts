import type { Request } from "express";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { InvoiceService } from "./invoice.service.js";

const user = (req: Request) => {
  if (!req.user)
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required");
  return req.user;
};

const create = catchAsync(async (req, res) =>
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Invoice created successfully",
    data: await InvoiceService.create(req.body, user(req).userId),
  }),
);

const page = catchAsync(async (req, res) => {
  const current = user(req);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Invoices fetched successfully",
    ...(await InvoiceService.page(current.userId, current.role, req.query)),
  });
});

const getById = catchAsync(async (req, res) => {
  const current = user(req);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Invoice fetched successfully",
    data: await InvoiceService.getById(
      current.userId,
      current.role,
      String(req.params.id),
    ),
  });
});

export const InvoiceController = { create, page, getById };
