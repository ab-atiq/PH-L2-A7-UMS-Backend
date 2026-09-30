import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { AdminService } from "./admin.service.js";

const getDashboardStats = catchAsync(async (_req, res) =>
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Admin dashboard statistics fetched successfully",
    data: await AdminService.getDashboardStats(),
  }),
);

const updateUserStatus = catchAsync(async (req, res) => {
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User status updated successfully",
    data: await AdminService.updateUserStatus(
      req.user!.userId,
      String(req.params.targetUserId),
      req.body.status,
    ),
  });
});

export const AdminController = { getDashboardStats, updateUserStatus };
