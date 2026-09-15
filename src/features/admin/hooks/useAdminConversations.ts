import { useQuery } from "@tanstack/react-query";
import { adminConversationsApi } from "@/services/api/admin/conversations";
import type { AdminConversationsFilters } from "@/features/admin/types";

export function useAdminConversationsListQuery(filters: AdminConversationsFilters) {
  return useQuery({
    queryKey: ["admin", "conversations", "list", filters],
    queryFn: () => adminConversationsApi.list(filters),
    placeholderData: (prev) => prev,
  });
}

export function useAdminConversationsStatsQuery(filters: AdminConversationsFilters) {
  return useQuery({
    queryKey: ["admin", "conversations", "stats", filters],
    queryFn: () => adminConversationsApi.stats(filters),
  });
}
