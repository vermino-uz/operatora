import type { AppRole } from "@/types/entities";

/**
 * Role groupings mirrored from the backend's `table-registry.ts` (see
 * ARCHITECTURE.md "Roles & Permissions") — kept in lockstep with the
 * backend's own groupings so a frontend-only permission check never
 * drifts from what the backend actually enforces. Hidden UI is a UX
 * courtesy only; the backend remains the authorization boundary.
 */
export const ADMIN_ROLES: AppRole[] = ["admin", "demo_admin", "super_admin"];
export const MANAGER_ROLES: AppRole[] = [...ADMIN_ROLES, "sales_manager"];
export const ALL_APP_ROLES: AppRole[] = [...MANAGER_ROLES, "operator", "finance_manager"];

/** True if `roles` contains at least one of `required` (global RBAC layer). */
export function hasAnyRole(roles: AppRole[], required: AppRole[]): boolean {
  return roles.some((r) => required.includes(r));
}

export function isAdmin(roles: AppRole[]): boolean {
  return hasAnyRole(roles, ADMIN_ROLES);
}

/**
 * Workspace-scoped permission dimension. `/api/auth/me` (and login) carry
 * only the global `roles[]`; workspace-level `role`/`permissions` come from
 * workspace membership data (`workspace_users`), fetched separately per
 * ARCHITECTURE.md — this helper accepts them explicitly rather than
 * reaching into a store, so callers stay in control of freshness.
 */
export function hasWorkspacePermission(
  permissions: Record<string, boolean> | null | undefined,
  key: string,
): boolean {
  return Boolean(permissions?.[key]);
}
