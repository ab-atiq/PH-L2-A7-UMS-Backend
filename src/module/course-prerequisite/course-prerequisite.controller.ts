import type { Request, Response } from "express";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { CoursePrerequisiteService } from "./course-prerequisite.service.js";

const getActorId = (req: Request) => {
  if (!req.user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required");
  }
  return req.user.userId;
};

const addPrerequisite = catchAsync(async (req: Request, res: Response) => {
  const result = await CoursePrerequisiteService.addPrerequisite(
    req.body,
    getActorId(req),
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Prerequisite added successfully",
    data: result,
  });
});

const getPrerequisites = catchAsync(async (req: Request, res: Response) => {
  const result = await CoursePrerequisiteService.getPrerequisites(
    String(req.params.courseId),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Prerequisites retrieved successfully",
    data: result,
  });
});

const removePrerequisite = catchAsync(async (req: Request, res: Response) => {
  const result = await CoursePrerequisiteService.removePrerequisite(
    String(req.params.courseId),
    String(req.params.prerequisiteId),
    getActorId(req),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Prerequisite removed successfully",
    data: result,
  });
});

export const CoursePrerequisiteController = {
  addPrerequisite,
  getPrerequisites,
  removePrerequisite,
};
