import type { Request, Response } from "express";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { StudentService } from "./student.service.js";

const actorId = (req: Request) => {
  if (!req.user)
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required");
  return req.user.userId;
};

const createStudentProfile = catchAsync(async (req: Request, res: Response) => {
  const data = await StudentService.createStudentProfile(
    req.body,
    actorId(req),
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Student profile created successfully",
    data,
  });
});

const listStudentProfilesByAdmin = catchAsync(
  async (req: Request, res: Response) => {
    const result = await StudentService.listStudentProfilesByAdmin(req.query);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Student profiles fetched successfully",
      data: result.data,
      meta: result.meta,
    });
  },
);

const getStudentProfile = catchAsync(async (req: Request, res: Response) => {
  const data = await StudentService.getStudentProfile(
    String(req.params.studentId),
    req.user?.role === "ADMIN",
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Student profile fetched successfully",
    data,
  });
});
const updateStudentProfile = catchAsync(async (req: Request, res: Response) => {
  const data = await StudentService.updateStudentProfile(
    String(req.params.studentId),
    req.body,
    actorId(req),
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Student profile updated successfully",
    data,
  });
});
const deleteStudentProfile = catchAsync(async (req: Request, res: Response) => {
  const data = await StudentService.deleteStudentProfile(
    String(req.params.studentId),
    actorId(req),
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Student profile deleted successfully",
    data,
  });
});

const getMyStudentProfile = catchAsync(async (req: Request, res: Response) => {
  const data = await StudentService.getMyStudentProfile(actorId(req));
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Student profile fetched successfully",
    data,
  });
});

const createMyStudentProfile = catchAsync(
  async (req: Request, res: Response) => {
    const data = await StudentService.createMyStudentProfile(
      req.body,
      actorId(req),
    );
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Student profile created successfully",
      data,
    });
  },
);

const updateMyStudentProfile = catchAsync(
  async (req: Request, res: Response) => {
    const data = await StudentService.updateMyStudentProfile(
      req.body,
      actorId(req),
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Student profile updated successfully",
      data,
    });
  },
);

const deleteMyStudentProfile = catchAsync(
  async (req: Request, res: Response) => {
    const data = await StudentService.deleteMyStudentProfile(actorId(req));
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Student profile deleted successfully",
      data,
    });
  },
);

export const StudentController = {
  listStudentProfilesByAdmin,
  createStudentProfile,
  getStudentProfile,
  updateStudentProfile,
  deleteStudentProfile,
  getMyStudentProfile,
  createMyStudentProfile,
  updateMyStudentProfile,
  deleteMyStudentProfile,
};
