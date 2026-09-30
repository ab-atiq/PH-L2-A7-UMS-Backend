import type { Request } from "express";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import type { FacultySectionListQuery } from "./section-faculty.interface.js";
import { SectionFacultyService } from "./section-faculty.service.js";

const actor = (req: Request) => req.user!;

const getAllSectionInfoByFacultyWithFilter = catchAsync(async (req, res) => {
  const query: FacultySectionListQuery = {};
  if (typeof req.query.page === "string") query.page = Number(req.query.page);
  if (typeof req.query.limit === "string")
    query.limit = Number(req.query.limit);
  if (typeof req.query.search === "string") query.search = req.query.search;
  if (typeof req.query.courseId === "string")
    query.courseId = req.query.courseId;
  if (typeof req.query.semesterId === "string")
    query.semesterId = req.query.semesterId;
  if (typeof req.query.status === "string") query.status = req.query.status;
  if (req.query.sortOrder === "asc" || req.query.sortOrder === "desc") {
    query.sortOrder = req.query.sortOrder;
  }

  const result = await SectionFacultyService.listSectionsForFaculty(
    actor(req).userId,
    query,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Faculty sections fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

const assignFacultyToSection = catchAsync(async (req, res) => {
  const data = await SectionFacultyService.assignFacultyToSection(
    { ...req.body, sectionId: String(req.params.sectionId) },
    actor(req).userId,
  );

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Faculty assigned successfully",
    data: data,
  });
});

const removeFacultyFromSection = catchAsync(async (req, res) => {
  const data = await SectionFacultyService.removeFacultyFromSection(
    String(req.params.sectionId),
    String(req.params.facultyId),
    actor(req).userId,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Faculty assignment removed successfully",
    data: data,
  });
});

export const SectionFacultyController = {
  getAllSectionInfoByFacultyWithFilter,
  assignFacultyToSection,
  removeFacultyFromSection,
};
