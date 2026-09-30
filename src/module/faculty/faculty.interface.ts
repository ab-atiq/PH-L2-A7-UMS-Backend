export type FacultyListSearch = {
  search?: string;
};

export type FacultyListFilter = {
  departmentId?: string;
  employeeId?: string;
  designation?: string;
  specialization?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  departmentName?: string;
  departmentCode?: string;
};

export type FacultyById = {
  employeeId: string;
};

export type FacultyCreateData = {
  employeeId: string;
  designation: string;
  specialization?: string | null;
  departmentId?: string | null;
  userId: string;
  joinDate?: Date | null;
};

export type FacultyUpdateData = {
  employeeId?: string;
  designation?: string;
  specialization?: string | null;
  departmentId?: string | null;
  userId?: string;
  joinDate?: Date | null;
};
