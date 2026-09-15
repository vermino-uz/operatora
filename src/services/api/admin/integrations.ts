import { apiFetch } from "@/services/api/client";
import { buildAdminQuery } from "@/services/api/admin/shared";
import type { IntegrationsFilters, IntegrationsSummary } from "@/features/admin/types";

/** `GET /admin/integrations` — confirmed against `admin-integrations.controller.ts`. */
export const adminIntegrationsApi = {
  list(filters: IntegrationsFilters): Promise<IntegrationsSummary> {
    return apiFetch<IntegrationsSummary>(`/admin/integrations${buildAdminQuery(filters)}`);
  },
};
