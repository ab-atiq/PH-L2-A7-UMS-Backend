import type { Request, Response } from "express";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { SectionService } from "./section.service";

const actorId = (req: Request) => {
  if (!req.user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required");
  }
  return req.user.userId;
};

const sectionList = catchAsync(async (req: Request, res: Response) => {
  const result =
    req.user?.role === "ADMIN"
      ? await SectionService.sectionListByAdmin(req.query)
      : await SectionService.sectionList(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All Sections information fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getSingleSection = catchAsync(async (req: Request, res: Response) => {
  const result =
    req.user?.role === "ADMIN"
      ? await SectionService.getSingleSectionByAdmin(String(req.params.id))
      : await SectionService.getSingleSection(String(req.params.id));

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Section information fetched successfully",
    data: result,
  });
});

const createSection = catchAsync(async (req: Request, res: Response) => {
  const result = await SectionService.createSection(req.body, actorId(req));

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Section created successfully",
    data: result,
  });
});

const updateSection = catchAsync(async (req: Request, res: Response) => {
  const result = await SectionService.updateSection(
    String(req.params.id),
    req.body,
    actorId(req),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Section updated successfully",
    data: result,
  });
});

const removeSection = catchAsync(async (req: Request, res: Response) => {
  const result = await SectionService.removeSection(
    String(req.params.id),
    actorId(req),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Section deleted successfully",
    data: result,
  });
});

export const SectionController = {
  sectionList,
  getSingleSection,
  createSection,
  updateSection,
  removeSection,
};
