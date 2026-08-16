import { apiFetch } from "@/services/api/client";
import type {
  EffectiveWorkspacePermissions,
  PermissionMatrix,
  WorkspaceRole,
} from "@/features/roles/types";

/** Same confirmed exception as `settings.ts`/`chat.ts` — `workspace_id`
 * must be sent explicitly (query param on reads, body field on writes),
 * the backend doesn't derive it from the JWT alone here. */
export const rolesApi = {
  async me(workspaceId: string): Promise<EffectiveWorkspacePermissions> {
    return apiFetch<EffectiveWorkspacePermissions>(
      `/workspace-rbac/me?workspace_id=${encodeURIComponent(workspaceId)}`,
    );
  },

  async list(workspaceId: string): Promise<WorkspaceRole[]> {
    return apiFetch<WorkspaceRole[]>(`/workspace-rbac/roles?workspace_id=${encodeURIComponent(workspaceId)}`);
  },

  async create(workspaceId: string, name: string): Promise<WorkspaceRole> {
    return apiFetch<WorkspaceRole>(`/workspace-rbac/roles`, {
      method: "POST",
      body: { workspace_id: workspaceId, name },
    });
  },

  async remove(workspaceId: string, roleId: string): Promise<void> {
    await apiFetch<{ success: true }>(
      `/workspace-rbac/roles/${encodeURIComponent(roleId)}?workspace_id=${encodeURIComponent(workspaceId)}`,
      { method: "DELETE" },
    );
  },

  async getPermissions(workspaceId: string, roleId: string): Promise<PermissionMatrix> {
    return apiFetch<PermissionMatrix>(
      `/workspace-rbac/roles/${encodeURIComponent(roleId)}/permissions?workspace_id=${encodeURIComponent(workspaceId)}`,
    );
  },

  async setPermissions(workspaceId: string, roleId: string, matrix: PermissionMatrix): Promise<void> {
    await apiFetch<{ success: true }>(
      `/workspace-rbac/roles/${encodeURIComponent(roleId)}/permissions`,
      { method: "PUT", body: { workspace_id: workspaceId, matrix } },
    );
  },

  async getUserRoles(workspaceId: string, userId: string): Promise<{ user_id: string; role_ids: string[] }> {
    return apiFetch<{ user_id: string; role_ids: string[] }>(
      `/workspace-rbac/users/${encodeURIComponent(userId)}/roles?workspace_id=${encodeURIComponent(workspaceId)}`,
    );
  },

  async setUserRoles(
    workspaceId: string,
    userId: string,
    roleIds: string[],
  ): Promise<{ user_id: string; role_ids: string[] }> {
    return apiFetch<{ user_id: string; role_ids: string[] }>(
      `/workspace-rbac/users/${encodeURIComponent(userId)}/roles`,
      { method: "PUT", body: { workspace_id: workspaceId, role_ids: roleIds } },
    );
  },
};
