import { apiFetch } from "@/services/api/client";
import { buildAdminQuery } from "@/services/api/admin/shared";
import type { AuditLogRow, AuditLogsFilters } from "@/features/admin/types";

/** `GET /admin/audit-logs` — confirmed against `admin-audit-logs.controller.ts`. Read-only. */
export const adminAuditLogsApi = {
  list(filters: AuditLogsFilters): Promise<{ rows: AuditLogRow[]; total: number; page: number; perPage: number }> {
    return apiFetch(`/admin/audit-logs${buildAdminQuery(filters)}`);
  },
};
