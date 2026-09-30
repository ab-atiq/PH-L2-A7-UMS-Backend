export type SectionFacultyData = {
  sectionId: string;
  facultyId: string;
  isPrimary?: boolean;
};

export type FacultySectionListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  courseId?: string;
  semesterId?: string;
  status?: string;
  sortOrder?: "asc" | "desc";
};
