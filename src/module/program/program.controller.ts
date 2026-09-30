import type { Request, Response } from "express";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { ProgramService } from "./program.service.js";

const getActorId = (req: Request) => {
  if (!req.user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required");
  }
  return req.user.userId;
};

const programList = catchAsync(async (req: Request, res: Response) => {
  const result =
    req.user?.role === "ADMIN"
      ? await ProgramService.programListByAdmin(req.query)
      : await ProgramService.programList(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All Programs information fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getSingleProgram = catchAsync(async (req: Request, res: Response) => {
  const result =
    req.user?.role === "ADMIN"
      ? await ProgramService.getSingleProgramByAdmin(String(req.params.id))
      : await ProgramService.getSingleProgram(String(req.params.id));

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Program information fetched successfully",
    data: result,
  });
});

const createNewProgram = catchAsync(async (req: Request, res: Response) => {
  const result = await ProgramService.createNewProgram(
    req.body,
    getActorId(req),
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Program created successfully",
    data: result,
  });
});

const updateProgram = catchAsync(async (req: Request, res: Response) => {
  const result = await ProgramService.updateProgram(
    String(req.params.id),
    req.body,
    getActorId(req),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Program updated successfully",
    data: result,
  });
});

const removeProgram = catchAsync(async (req: Request, res: Response) => {
  const result = await ProgramService.removeProgram(
    String(req.params.id),
    getActorId(req),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Program deleted successfully",
    data: result,
  });
});

export const ProgramController = {
  programList,
  getSingleProgram,
  programListByAdmin: programList,
  getSingleProgramByAdmin: getSingleProgram,
  createNewProgram,
  updateProgram,
  removeProgram,
};
