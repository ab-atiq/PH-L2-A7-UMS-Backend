import type { Request } from "express";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { ApplicationService } from "./application.service.js";
import type { CreateRoleApplication } from "./application.validation.js";

const getUserId = (req: Request) => {
  if (!req.user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required");
  }
  return req.user.userId;
};

const listApplicationsByAdmin = catchAsync(async (req, res) => {
  const result = await ApplicationService.listApplicationsByAdmin(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Role applications fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

const updateApplicationStatus = catchAsync(async (req, res) => {
  const application = await ApplicationService.updateApplicationStatus(
    String(req.params.id),
    req.body.status,
    getUserId(req),
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Application status updated successfully",
    data: application,
  });
});

const createRoleApplication = catchAsync(async (req, res) => {
  const application = await ApplicationService.createRoleApplication(
    getUserId(req),
    req.body as CreateRoleApplication,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Your application has been submitted",
    data: application,
  });
});

const getMyRoleApplication = catchAsync(async (req, res) => {
  const application = await ApplicationService.getMyRoleApplication(
    getUserId(req),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Application status fetched successfully",
    data: application,
  });
});

export const ApplicationController = {
  listApplicationsByAdmin,
  updateApplicationStatus,
  createRoleApplication,
  getMyRoleApplication,
};
