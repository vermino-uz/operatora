import { useQuery } from "@tanstack/react-query";
import { adminAuditLogsApi } from "@/services/api/admin/auditLogs";
import type { AuditLogsFilters } from "@/features/admin/types";

export function useAdminAuditLogsQuery(filters: AuditLogsFilters) {
  return useQuery({
    queryKey: ["admin", "audit-logs", filters],
    queryFn: () => adminAuditLogsApi.list(filters),
    placeholderData: (prev) => prev,
  });
}
