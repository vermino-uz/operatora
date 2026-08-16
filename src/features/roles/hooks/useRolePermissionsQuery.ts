import { useQuery } from "@tanstack/react-query";

import { rolesApi } from "@/services/api/roles";
import { emptyPermissionMatrix, PERMISSION_MODULES } from "@/features/roles/types";
import type { PermissionMatrix } from "@/features/roles/types";

export function useRolePermissionsQuery(workspaceId: string | null, roleId: string | null) {
  return useQuery({
    queryKey: ["workspace-rbac-permissions", workspaceId, roleId],
    queryFn: async (): Promise<PermissionMatrix> => {
      const partial = await rolesApi.getPermissions(workspaceId as string, roleId as string);
      // A role saved before a module existed won't have that key — merge
      // onto a full-key template so the matrix table never indexes
      // `undefined` (mirrors the old frontend's same defensive merge).
      const full = emptyPermissionMatrix();
      for (const mod of PERMISSION_MODULES) {
        full[mod] = { ...full[mod], ...partial[mod] };
      }
      return full;
    },
    enabled: Boolean(workspaceId) && Boolean(roleId),
  });
}
