import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import type z from "zod";
import { AppError } from "../utils/AppError.js";
import { catchAsync } from "../utils/catchAsync.js";

export const validateRequest = (
  zodSchema: z.ZodObject,
  source: "body" | "query" = "body",
) => {
  return catchAsync((req: Request, res: Response, next: NextFunction) => {
    const payload = source === "query" ? req.query : (req.body ?? {});

    const result = zodSchema.safeParse(payload);

    if (!result.success) {
      console.log(result.error);
      console.log(result.error.issues);

      throw new AppError(
        httpStatus.BAD_REQUEST,
        result.error.issues[0]!.message,
      );
    }

    if (source === "query") {
      Object.assign(req.query, result.data);
    } else {
      req.body = result.data;
    }

    next();
  });
};
