import { useQuery } from "@tanstack/react-query";
import { adminAiUsageApi } from "@/services/api/admin/aiUsage";
import type { AiUsageFilters } from "@/features/admin/types";

export function useAdminAiUsageOverviewQuery(filters: AiUsageFilters) {
  return useQuery({
    queryKey: ["admin", "ai-usage", "overview", filters],
    queryFn: () => adminAiUsageApi.overview(filters),
  });
}

export function useAdminAiUsageByDayQuery(filters: AiUsageFilters, days = 30) {
  return useQuery({
    queryKey: ["admin", "ai-usage", "by-day", filters, days],
    queryFn: () => adminAiUsageApi.byDay(filters, days),
  });
}

export function useAdminAiUsageRecentQuery(filters: AiUsageFilters, limit = 50) {
  return useQuery({
    queryKey: ["admin", "ai-usage", "recent", filters, limit],
    queryFn: () => adminAiUsageApi.recent(filters, limit),
    enabled: Boolean(filters.workspaceId || filters.feature),
  });
}

export function useAdminAiUsageModelsQuery() {
  return useQuery({
    queryKey: ["admin", "ai-usage", "models"],
    queryFn: () => adminAiUsageApi.models(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminAiUsageFeaturesQuery() {
  return useQuery({
    queryKey: ["admin", "ai-usage", "features"],
    queryFn: () => adminAiUsageApi.features(),
    staleTime: 5 * 60 * 1000,
  });
}
