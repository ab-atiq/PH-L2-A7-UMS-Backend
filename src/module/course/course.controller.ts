import type { Request, Response } from "express";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { CourseService } from "./course.service.js";

const getActorId = (req: Request) => {
  if (!req.user)
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required");
  return req.user.userId;
};

const courseList = catchAsync(async (req: Request, res: Response) => {
  const result =
    req.user?.role === "ADMIN"
      ? await CourseService.courseListByAdmin(req.query)
      : await CourseService.courseList(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All Courses information fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getSingleCourse = catchAsync(async (req: Request, res: Response) => {
  const result =
    req.user?.role === "ADMIN"
      ? await CourseService.getSingleCourseByAdmin(String(req.params.id))
      : await CourseService.getSingleCourse(String(req.params.id));

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Course information fetched successfully",
    data: result,
  });
});

const createNewCourse = catchAsync(async (req: Request, res: Response) => {
  const result = await CourseService.createNewCourse(req.body, getActorId(req));

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Course created successfully",
    data: result,
  });
});

const updateCourse = catchAsync(async (req: Request, res: Response) => {
  const result = await CourseService.updateCourse(
    String(req.params.id),
    req.body,
    getActorId(req),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Course updated successfully",
    data: result,
  });
});

const removeCourse = catchAsync(async (req: Request, res: Response) => {
  const result = await CourseService.removeCourse(
    String(req.params.id),
    getActorId(req),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Course deleted successfully",
    data: result,
  });
});

export const CourseController = {
  courseList,
  getSingleCourse,
  courseListByAdmin: courseList,
  getSingleCourseByAdmin: getSingleCourse,
  createNewCourse,
  updateCourse,
  removeCourse,
};
