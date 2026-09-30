import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { AuditLogService } from "./audit-log.service.js";

const list = catchAsync(async (req, res) =>
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Audit logs fetched successfully",
    ...(await AuditLogService.list(req.query)),
  }),
);
export const AuditLogController = { list };
