import { useQuery } from "@tanstack/react-query";
import { adminAnalyticsApi } from "@/services/api/admin/analytics";
import type { AdminAnalyticsFilters } from "@/features/admin/types";

export function useAdminAnalyticsOverviewQuery(filters: AdminAnalyticsFilters) {
  return useQuery({
    queryKey: ["admin", "analytics", "overview", filters],
    queryFn: () => adminAnalyticsApi.overview(filters),
  });
}

export function useAdminAnalyticsEventsQuery(filters: AdminAnalyticsFilters & { page?: number; perPage?: number }) {
  return useQuery({
    queryKey: ["admin", "analytics", "events", filters],
    queryFn: () => adminAnalyticsApi.events(filters),
    placeholderData: (prev) => prev,
  });
}

export function useAdminAnalyticsEventNamesQuery() {
  return useQuery({
    queryKey: ["admin", "analytics", "event-names"],
    queryFn: () => adminAnalyticsApi.eventNames(),
    staleTime: 5 * 60 * 1000,
  });
}
