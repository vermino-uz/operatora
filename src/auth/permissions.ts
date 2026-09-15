import type { AppRole } from "@/types/entities";
import type {
  EffectiveWorkspacePermissions,
  PermissionAction,
  PermissionModule,
} from "@/features/roles/types";

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
 * only the global `roles[]`; the tenant-scoped `role`/`permissions` layer
 * (`workspace_users`) is exposed over `GET /api/workspace-rbac/me` as an
 * `EffectiveWorkspacePermissions` matrix (`{module: {action: boolean}}`),
 * NOT the flat `Record<string, boolean>` the Prisma-derived guess in
 * ARCHITECTURE.md's "Roles & Permissions" section implied — confirmed
 * against `workspace-rbac.controller.ts`/`.service.ts` in the old backend
 * and against the live `test.operatora.ai` deployment (same 401 envelope
 * shape from `GET /api/workspace-rbac/me` as the source predicts).
 *
 * These helpers accept the effective-permissions object explicitly rather
 * than reaching into a store/query cache themselves, so callers
 * (`useModulePermission`, route guards, nav filtering) stay in control of
 * which workspace's data is in scope and its freshness.
 */
export function hasWorkspacePermission(
  effective: EffectiveWorkspacePermissions | null | undefined,
  module: PermissionModule,
  action: PermissionAction = "view",
): boolean {
  return Boolean(effective?.matrix?.[module]?.[action]);
}

/** True if the caller's workspace membership `role` is an admin-tier one
 * (`workspace_owner`/`workspace_admin`/legacy `owner`/`admin`) — mirrors
 * the backend's own `ADMIN_WORKSPACE_ROLES` set
 * (`workspace-rbac.constants.ts`), which already gets full-matrix access
 * server-side; kept here so the frontend can short-circuit the same way
 * without waiting on a matrix fetch. */
const ADMIN_WORKSPACE_ROLES = new Set(["workspace_owner", "workspace_admin", "owner", "admin"]);

export function isWorkspaceAdmin(effective: EffectiveWorkspacePermissions | null | undefined): boolean {
  return Boolean(effective?.workspace_role && ADMIN_WORKSPACE_ROLES.has(effective.workspace_role));
}

/**
 * Combined permission check across BOTH RBAC dimensions, per
 * ARCHITECTURE.md's explicit guidance that "a single flat isAdmin boolean
 * is not sufficient": a platform-level global role (`ADMIN_ROLES`) always
 * grants access (these roles operate above any single workspace's RBAC
 * matrix), otherwise access falls through to the workspace-scoped
 * `role`/`permissions` matrix for the module+action being checked.
 *
 * While `effective` hasn't loaded yet (still fetching, or the caller has no
 * workspace), this deliberately does NOT default to `true` — unlike the
 * global-role check, workspace RBAC is deny-by-default; call sites that
 * want a "keep visible while loading" UX should branch on the query's
 * `isLoading` state explicitly instead of leaning on this returning true.
 */
export function canAccessModule(
  roles: AppRole[],
  effective: EffectiveWorkspacePermissions | null | undefined,
  module: PermissionModule,
  action: PermissionAction = "view",
): boolean {
  if (isAdmin(roles)) return true;
  return hasWorkspacePermission(effective, module, action);
}
