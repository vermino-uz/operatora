import { useQuery } from "@tanstack/react-query";

import { rolesApi } from "@/services/api/roles";

export function useWorkspaceRolesQuery(workspaceId: string | null) {
  return useQuery({
    queryKey: ["workspace-rbac-roles", workspaceId],
    queryFn: () => rolesApi.list(workspaceId as string),
    enabled: Boolean(workspaceId),
  });
}

/** The caller's own effective role + permission matrix in the current
 * workspace — used to show a "your access" summary and to let a 403 on the
 * roles list read naturally as "you don't have admin access here" via
 * `ErrorState`, without a second gating call on every settings section. */
export function useMyWorkspacePermissionsQuery(workspaceId: string | null) {
  return useQuery({
    queryKey: ["workspace-rbac-me", workspaceId],
    queryFn: () => rolesApi.me(workspaceId as string),
    enabled: Boolean(workspaceId),
    staleTime: 60_000,
  });
}
