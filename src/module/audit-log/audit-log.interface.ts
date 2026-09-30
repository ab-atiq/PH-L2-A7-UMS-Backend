export type AuditLogListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  action?: string;
  entity?: string;
  actorId?: string;
  sortOrder?: "asc" | "desc";
};
