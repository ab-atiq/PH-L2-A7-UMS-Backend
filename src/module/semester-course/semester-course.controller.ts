import type { Request } from "express";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { SemesterCourseService } from "./semester-course.service.js";

const actorId = (req: Request) => {
  if (!req.user)
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required");
  return req.user.userId;
};

export const SemesterCourseController = {
  myCourses: catchAsync(async (req, res) =>
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Assigned courses fetched successfully",
      data: await SemesterCourseService.myCourses(actorId(req)),
    }),
  ),
  list: catchAsync(async (req, res) =>
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Semester courses fetched successfully",
      data: await SemesterCourseService.list(
        String(req.params.programSemesterId),
      ),
    }),
  ),
  create: catchAsync(async (req, res) =>
    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Course assigned to semester successfully",
      data: await SemesterCourseService.create(
        String(req.params.programSemesterId),
        req.body,
        actorId(req),
      ),
    }),
  ),
  update: catchAsync(async (req, res) =>
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Semester course updated successfully",
      data: await SemesterCourseService.update(
        String(req.params.id),
        req.body,
        actorId(req),
      ),
    }),
  ),
  remove: catchAsync(async (req, res) =>
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Semester course removed successfully",
      data: await SemesterCourseService.remove(
        String(req.params.id),
        actorId(req),
      ),
    }),
  ),
};
