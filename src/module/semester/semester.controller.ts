import type { Request, Response } from "express";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { SemesterService } from "./semester.service.js";

const actorId = (req: Request) => {
  if (!req.user)
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required");
  return req.user.userId;
};

const semesterList = catchAsync(async (req: Request, res: Response) => {
  const result =
    req.user?.role === "ADMIN"
      ? await SemesterService.semesterListByAdmin(req.query)
      : await SemesterService.semesterList(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All Semesters information fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getSingleSemester = catchAsync(async (req: Request, res: Response) => {
  const result =
    req.user?.role === "ADMIN"
      ? await SemesterService.getSingleSemesterByAdmin(String(req.params.id))
      : await SemesterService.getSingleSemester(String(req.params.id));

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Semester information fetched successfully",
    data: result,
  });
});

const createSemester = catchAsync(async (req: Request, res: Response) => {
  const result = await SemesterService.createSemester(req.body, actorId(req));

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Semester created successfully",
    data: result,
  });
});

const updateSemester = catchAsync(async (req: Request, res: Response) => {
  const result = await SemesterService.updateSemester(
    String(req.params.id),
    req.body,
    actorId(req),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Semester updated successfully",
    data: result,
  });
});

const removeSemester = catchAsync(async (req: Request, res: Response) => {
  const result = await SemesterService.removeSemester(
    String(req.params.id),
    actorId(req),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Semester deleted successfully",
    data: result,
  });
});

export const SemesterController = {
  semesterList,
  getSingleSemester,
  createSemester,
  updateSemester,
  removeSemester,
};
