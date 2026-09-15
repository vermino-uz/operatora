import { apiFetch } from "@/services/api/client";
import { buildAdminQuery } from "@/services/api/admin/shared";
import type {
  AdminAnalyticsFilters,
  AnalyticsByDay,
  AnalyticsByEventName,
  AnalyticsByWorkspace,
  AnalyticsEventsListResponse,
  AnalyticsTotals,
} from "@/features/admin/types";

/**
 * `/admin/analytics/*` — real, confirmed against `admin-analytics.controller.ts`.
 * Not in ARCHITECTURE.md's original admin route list, but live on the
 * backend and in the old admin sidebar, so ported per the task's "check
 * whether it's real/live and worth porting too" instruction.
 */
export const adminAnalyticsApi = {
  overview(
    filters: AdminAnalyticsFilters,
  ): Promise<{ totals: AnalyticsTotals; topEvents: AnalyticsByEventName[]; topWorkspaces: AnalyticsByWorkspace[] }> {
    return apiFetch(`/admin/analytics/overview${buildAdminQuery(filters)}`);
  },
  byDay(filters: AdminAnalyticsFilters, days = 30): Promise<AnalyticsByDay[]> {
    return apiFetch<AnalyticsByDay[]>(`/admin/analytics/by-day${buildAdminQuery({ ...filters, days })}`);
  },
  events(filters: AdminAnalyticsFilters & { page?: number; perPage?: number }): Promise<AnalyticsEventsListResponse> {
    return apiFetch<AnalyticsEventsListResponse>(`/admin/analytics/events${buildAdminQuery(filters)}`);
  },
  eventNames(): Promise<string[]> {
    return apiFetch<string[]>("/admin/analytics/event-names");
  },
};
