import type { Request } from "express";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { AttendanceService } from "./attendance.service.js";
const actor = (req: Request) => req.user!;
export const AttendanceController = {
  list: catchAsync(async (req, res) => {
    const user = actor(req);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Attendance fetched successfully",
      data: await AttendanceService.list(
        user.userId,
        user.role,
        typeof req.params.semesterCourseId === "string"
          ? req.params.semesterCourseId
          : undefined,
      ),
    });
  }),
  create: catchAsync(async (req, res) =>
    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Attendance marked successfully",
      data: await AttendanceService.create(actor(req).userId, {
        ...req.body,
        semesterCourseId: String(req.params.semesterCourseId),
      }),
    }),
  ),
  update: catchAsync(async (req, res) =>
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Attendance updated successfully",
      data: await AttendanceService.update(
        actor(req).userId,
        String(req.params.id),
        req.body,
      ),
    }),
  ),
};
