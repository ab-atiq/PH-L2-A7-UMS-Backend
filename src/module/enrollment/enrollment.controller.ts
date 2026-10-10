import type { Request } from "express";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import type {
  EnrollmentCreateData,
  EnrollmentListQuery,
} from "./enrollment.interface.js";
import { EnrollmentService } from "./enrollment.service";

const user = (req: Request) => {
  if (!req.user)
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required");
  return req.user;
};

const listEnrollments = catchAsync(async (req, res) => {
  const current = user(req);
  const query: EnrollmentListQuery = {};

  if (typeof req.query.page === "string") {
    query.page = Number(req.query.page);
  }
  if (typeof req.query.limit === "string") {
    query.limit = Number(req.query.limit);
  }
  if (typeof req.query.status === "string") {
    query.status = req.query.status;
  }
  if (typeof req.query.semesterCourseId === "string") {
    query.semesterCourseId = req.query.semesterCourseId;
  }
  const result = await EnrollmentService.listEnrollments({
    userId: current.userId,
    role: current.role,
    query,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Enrollments fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

const createEnrollment = catchAsync(async (req, res) => {
  const result = await EnrollmentService.createEnrollment(
    user(req).userId,
    req.body as EnrollmentCreateData,
  );

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Enrollment created successfully",
    data: result,
  });
});

export const EnrollmentController = {
  listEnrollments,
  createEnrollment,
};
