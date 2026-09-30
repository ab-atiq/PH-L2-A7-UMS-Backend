import type { Request, Response } from "express";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { DepartmentService } from "./department.service";

const getActorId = (req: Request) => {
  if (!req.user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required");
  }
  return req.user.userId;
};

const departmentList = catchAsync(async (req: Request, res: Response) => {
  const result =
    req.user?.role === "ADMIN"
      ? await DepartmentService.departmentListByAdmin(req.query)
      : await DepartmentService.departmentList(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All Departments information fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getSingleDepartment = catchAsync(async (req: Request, res: Response) => {
  const result =
    req.user?.role === "ADMIN"
      ? await DepartmentService.getSingleDepartmentByAdmin(
          String(req.params.id),
        )
      : await DepartmentService.getSingleDepartment(String(req.params.id));

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Department information fetched successfully",
    data: result,
  });
});

const createNewDepartment = catchAsync(async (req: Request, res: Response) => {
  const result = await DepartmentService.createNewDepartment(
    req.body,
    getActorId(req),
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Department created successfully",
    data: result,
  });
});

const updateDepartment = catchAsync(async (req: Request, res: Response) => {
  const result = await DepartmentService.updateDepartment(
    String(req.params.id),
    req.body,
    getActorId(req),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Department updated successfully",
    data: result,
  });
});

const removeDepartment = catchAsync(async (req: Request, res: Response) => {
  const result = await DepartmentService.removeDepartment(
    String(req.params.id),
    getActorId(req),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Department deleted successfully",
    data: result,
  });
});

export const DepartmentController = {
  departmentList,
  getSingleDepartment,
  departmentListByAdmin: departmentList,
  getSingleDepartmentByAdmin: getSingleDepartment,
  createNewDepartment,
  updateDepartment,
  removeDepartment,
};
