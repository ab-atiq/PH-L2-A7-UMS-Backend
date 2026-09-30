import type { Request } from "express";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { ResultService } from "./result.service.js";
const actor = (req: Request) => req.user!;
export const ResultController = {
  list: catchAsync(async (req, res) => {
    const user = actor(req);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Results fetched successfully",
      data: await ResultService.list(user.userId, user.role, req.query),
    });
  }),
  submit: catchAsync(async (req, res) =>
    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Result submitted successfully",
      data: await ResultService.submit(actor(req).userId, req.body),
    }),
  ),
  publish: catchAsync(async (req, res) =>
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Result published successfully",
      data: await ResultService.publish(
        actor(req).userId,
        String(req.params.id),
      ),
    }),
  ),
};
