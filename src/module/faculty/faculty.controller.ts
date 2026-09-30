import type { Request, Response } from "express";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { FacultyService } from "./faculty.service.js";

const listFacultySearch = catchAsync(async (req: Request, res: Response) => {
  const result = await FacultyService.listFacultySearch(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All faculty members fetched successfully",
    data: result,
  });
});

const listFacultyFilter = catchAsync(async (req: Request, res: Response) => {
  const result = await FacultyService.listFacultyFilter(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All faculty members fetched successfully",
    data: result,
  });
});

const singleFaculty = catchAsync(async (req: Request, res: Response) => {
  const result = await FacultyService.getFacultyById(
    String(req.params.employeeId),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Faculty member fetched successfully",
    data: result,
  });
});

const createFacultyProfile = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required");
  }
  const result = await FacultyService.createFacultyProfile(
    req.body,
    req.user.userId,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Faculty profile created successfully",
    data: result,
  });
});

const updateFacultyProfile = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required");
  }

  const result = await FacultyService.updateFacultyProfile(
    String(req.params.employeeId),
    req.body,
    req.user.userId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Faculty profile updated successfully",
    data: result,
  });
});

const deleteFacultyProfile = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required");
  }

  const result = await FacultyService.deleteFacultyProfile(
    String(req.params.employeeId),
    req.user.userId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Faculty profile deleted successfully",
    data: result,
  });
});

export const FacultyController = {
  listFacultySearch,
  listFacultyFilter,
  singleFaculty,
  createFacultyProfile,
  updateFacultyProfile,
  deleteFacultyProfile,
};
