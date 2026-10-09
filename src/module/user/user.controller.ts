import type { Request, Response } from "express";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { UserServices } from "./user.service";

const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "User information is missing in the request",
    );
  }

  const result = await UserServices.getMyProfile(req.user.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile fetched successfully",
    data: result,
  });
});

const updateMyProfile = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "User information is missing in the request",
    );
  }

  const result = await UserServices.updateMyProfile(req.user.userId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile updated successfully",
    data: result,
  });
});

const uploadProfileImage = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError(httpStatus.BAD_REQUEST, "No File Provided.");
  }

  const userId = req.user?.userId;

  const result = await UserServices.uploadProfileImage(
    req.file?.buffer,
    userId!,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "New profile image uploaded successfully",
    data: result,
  });
});

const getActorId = (req: Request) => {
  if (!req.user)
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required");
  return req.user.userId;
};

const listUsersByAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await UserServices.listUsersByAdmin(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Users fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getUserByAdmin = catchAsync(async (req: Request, res: Response) => {
  const data = await UserServices.getUserByAdmin(String(req.params.id));
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User fetched successfully",
    data,
  });
});

const updateUserByAdmin = catchAsync(async (req: Request, res: Response) => {
  const data = await UserServices.updateUserByAdmin(
    String(req.params.id),
    req.body,
    getActorId(req),
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User updated successfully",
    data,
  });
});

const updateUserStatusByAdmin = catchAsync(
  async (req: Request, res: Response) => {
    if (
      String(req.params.id) === getActorId(req) &&
      req.body.status !== "ACTIVE"
    ) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "You cannot suspend or deactivate your own administrator account",
      );
    }
    const data = await UserServices.updateUserStatusByAdmin(
      String(req.params.id),
      req.body.status,
      getActorId(req),
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "User status updated successfully",
      data,
    });
  },
);

const deleteUserByAdmin = catchAsync(async (req: Request, res: Response) => {
  const userId = String(req.params.id);
  if (userId === getActorId(req)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "You cannot delete your own administrator account",
    );
  }
  const data = await UserServices.deleteUserByAdmin(userId, getActorId(req));
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User deleted successfully",
    data,
  });
});

export const UserController = {
  listUsersByAdmin,
  getUserByAdmin,
  updateUserByAdmin,
  updateUserStatusByAdmin,
  deleteUserByAdmin,
  getMyProfile,
  updateMyProfile,
  uploadProfileImage,
};
