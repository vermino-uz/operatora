import { hasAnyRole, MANAGER_ROLES } from "@/auth/permissions";
import type { AppRole } from "@/types/entities";

/** Ported 1:1 from the old frontend's `lib/taskPermissions.ts`'s
 * `canManageTeamTasks()` — global app-manager roles (already matches this
 * app's `MANAGER_ROLES`) OR a workspace-level manager/owner role. Unlike
 * the earlier approximation used by Leads' AI Distribution entry point
 * (Phase 2c-11, `hasAnyRole(roles, MANAGER_ROLES)` only, because no
 * workspace-role data was fetched client-side yet), this feature has a
 * real `workspace_role` available via `useMyWorkspacePermissionsQuery`
 * (Settings' Roles & Permissions section, `GET /workspace-rbac/me`), so it
 * reproduces the backend's actual two-part check exactly. */
const WS_MANAGER_ROLES = ["workspace_owner", "owner", "workspace_admin", "admin", "manager"];

export function canManageTeamTasks(globalRoles: AppRole[], workspaceRole: string | null | undefined): boolean {
  if (hasAnyRole(globalRoles, MANAGER_ROLES)) return true;
  if (workspaceRole && WS_MANAGER_ROLES.includes(workspaceRole)) return true;
  return false;
}
