import type { Request } from "express";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { ExamService } from "./exam.service.js";
const actor = (req: Request) => req.user!;
export const ExamController = {
  list: catchAsync(async (req, res) => {
    const user = actor(req);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Exams fetched successfully",
      data: await ExamService.list(user.userId, user.role, req.query),
    });
  }),
  create: catchAsync(async (req, res) =>
    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Exam created successfully",
      data: await ExamService.create(actor(req).userId, req.body),
    }),
  ),
  update: catchAsync(async (req, res) =>
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Exam updated successfully",
      data: await ExamService.update(
        actor(req).userId,
        String(req.params.id),
        req.body,
      ),
    }),
  ),
  publish: catchAsync(async (req, res) =>
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Exam published successfully",
      data: await ExamService.publish(actor(req).userId, String(req.params.id)),
    }),
  ),
};
