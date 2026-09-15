import { apiFetch } from "@/services/api/client";
import { buildAdminQuery } from "@/services/api/admin/shared";
import type { AiUsageByDay, AiUsageEvent, AiUsageFilters, AiUsageOverview } from "@/features/admin/types";

/** `/admin/ai-usage/*` — confirmed against `admin-ai-usage.controller.ts`. */
export const adminAiUsageApi = {
  overview(filters: AiUsageFilters): Promise<AiUsageOverview> {
    return apiFetch<AiUsageOverview>(`/admin/ai-usage/overview${buildAdminQuery({ ...filters, workspaceLimit: 100 })}`);
  },
  byDay(filters: AiUsageFilters, days = 30): Promise<AiUsageByDay[]> {
    return apiFetch<AiUsageByDay[]>(`/admin/ai-usage/by-day${buildAdminQuery({ ...filters, days })}`);
  },
  recent(filters: AiUsageFilters, limit = 50): Promise<AiUsageEvent[]> {
    return apiFetch<AiUsageEvent[]>(`/admin/ai-usage/recent${buildAdminQuery({ ...filters, limit })}`);
  },
  models(): Promise<string[]> {
    return apiFetch<string[]>("/admin/ai-usage/models");
  },
  features(): Promise<string[]> {
    return apiFetch<string[]>("/admin/ai-usage/features");
  },
};
