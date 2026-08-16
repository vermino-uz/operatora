import { useQuery } from "@tanstack/react-query";

import { teamApi } from "@/services/api/team";
import type { TeamMembersFilters } from "@/features/team/types";

export function useTeamMembersQuery(workspaceId: string | null, filters: TeamMembersFilters) {
  return useQuery({
    queryKey: ["workspace-operators", workspaceId, filters.q ?? "", filters.status ?? ""],
    queryFn: () => teamApi.list(workspaceId as string, filters),
    enabled: Boolean(workspaceId),
    placeholderData: (prev) => prev,
  });
}
