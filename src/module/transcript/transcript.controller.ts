import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { TranscriptService } from "./transcript.service.js";

const getMyTranscript = catchAsync(async (req, res) => {
  const transcript = await TranscriptService.getMyTranscript(
    req.user?.userId as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Transcript fetched successfully",
    data: transcript,
  });
});

export const TranscriptController = {
  getMyTranscript,
};
