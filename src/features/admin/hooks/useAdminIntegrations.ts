import { useQuery } from "@tanstack/react-query";
import { adminIntegrationsApi } from "@/services/api/admin/integrations";
import type { IntegrationsFilters } from "@/features/admin/types";

export function useAdminIntegrationsQuery(filters: IntegrationsFilters) {
  return useQuery({
    queryKey: ["admin", "integrations", filters],
    queryFn: () => adminIntegrationsApi.list(filters),
    placeholderData: (prev) => prev,
  });
}
