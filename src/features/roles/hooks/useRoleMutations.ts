import { useMutation, useQueryClient } from "@tanstack/react-query";

import { rolesApi } from "@/services/api/roles";
import type { PermissionMatrix } from "@/features/roles/types";

function invalidateRbac(queryClient: ReturnType<typeof useQueryClient>, workspaceId: string | null) {
  queryClient.invalidateQueries({ queryKey: ["workspace-rbac-roles", workspaceId] });
  queryClient.invalidateQueries({ queryKey: ["workspace-rbac-permissions", workspaceId] });
  queryClient.invalidateQueries({ queryKey: ["workspace-rbac-user-roles", workspaceId] });
  queryClient.invalidateQueries({ queryKey: ["workspace-rbac-me", workspaceId] });
}

export function useCreateRoleMutation(workspaceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => {
      if (!workspaceId) throw new Error("No workspace selected");
      return rolesApi.create(workspaceId, name);
    },
    onSuccess: () => invalidateRbac(queryClient, workspaceId),
  });
}

export function useDeleteRoleMutation(workspaceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roleId: string) => {
      if (!workspaceId) throw new Error("No workspace selected");
      return rolesApi.remove(workspaceId, roleId);
    },
    onSuccess: () => invalidateRbac(queryClient, workspaceId),
  });
}

export function useSetRolePermissionsMutation(workspaceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, matrix }: { roleId: string; matrix: PermissionMatrix }) => {
      if (!workspaceId) throw new Error("No workspace selected");
      return rolesApi.setPermissions(workspaceId, roleId, matrix);
    },
    onSuccess: (_data, { roleId }) => {
      queryClient.invalidateQueries({ queryKey: ["workspace-rbac-permissions", workspaceId, roleId] });
    },
  });
}

export function useSetUserRolesMutation(workspaceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roleIds }: { userId: string; roleIds: string[] }) => {
      if (!workspaceId) throw new Error("No workspace selected");
      return rolesApi.setUserRoles(workspaceId, userId, roleIds);
    },
    onSuccess: (_data, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ["workspace-rbac-user-roles", workspaceId, userId] });
      queryClient.invalidateQueries({ queryKey: ["workspace-operators", workspaceId] });
    },
  });
}
