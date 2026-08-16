import { useQuery } from "@tanstack/react-query";

import { rolesApi } from "@/services/api/roles";

/** A single member's assigned RBAC role ids — used by the Team Members edit
 * modal's role picker. */
export function useUserRolesQuery(workspaceId: string | null, userId: string | null) {
  return useQuery({
    queryKey: ["workspace-rbac-user-roles", workspaceId, userId],
    queryFn: () => rolesApi.getUserRoles(workspaceId as string, userId as string),
    enabled: Boolean(workspaceId) && Boolean(userId),
  });
}
