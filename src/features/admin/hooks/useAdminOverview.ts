import { useQuery } from "@tanstack/react-query";
import { adminOverviewApi } from "@/services/api/admin/overview";

export function useAdminOverviewQuery() {
  return useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => adminOverviewApi.get(),
    staleTime: 30_000,
  });
}
