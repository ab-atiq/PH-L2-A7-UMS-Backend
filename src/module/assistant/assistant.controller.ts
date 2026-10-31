import type { Request, Response } from "express";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { AssistantService } from "./assistant.service.js";

const getUserId = (req: Request) => {
  if (!req.user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required");
  }
  return req.user.userId;
};

const chat = catchAsync(async (req: Request, res: Response) => {
  const result = await AssistantService.chat(getUserId(req), req.body.message);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Academic guidance generated",
    data: result,
  });
});

const recommendations = catchAsync(async (req: Request, res: Response) => {
  const result = await AssistantService.getRecommendations(getUserId(req));
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Academic recommendations generated",
    data: result,
  });
});

export const AssistantController = { chat, recommendations };
