"use client";

import { useSessionStore } from "@/state/session-store";
import { canAccessModule, hasAnyRole, isAdmin } from "@/auth/permissions";
import { useMyWorkspacePermissionsQuery } from "@/features/roles/hooks/useWorkspaceRolesQuery";
import type { PermissionAction, PermissionModule } from "@/features/roles/types";
import type { AppRole } from "@/types/entities";

/** Convenience hook wrapping `hasAnyRole` against the current session's
 * global roles[]. Workspace-scoped permission checks (per-tenant
 * `role`/`permissions`) need the workspace membership data explicitly —
 * this hook only covers the global RBAC dimension. */
export function usePermission(required: AppRole[]): boolean {
  const roles = useSessionStore((s) => s.roles);
  return hasAnyRole(roles, required);
}

/**
 * Combined permission check for gating a feature module in the UI —
 * global `roles[]` (platform RBAC) OR the active workspace's RBAC matrix
 * (`workspace_users` role/permissions via `GET /workspace-rbac/me`), per
 * ARCHITECTURE.md's "Roles & Permissions" guidance that both dimensions
 * must be considered. Server state (the matrix) stays in TanStack Query;
 * this hook just combines it with the Zustand-held global roles at read
 * time, it never mirrors the matrix into client state itself.
 *
 * Returns `{ allowed, isLoading }` so callers can decide their own
 * loading-state UX (e.g. "keep the nav item visible while loading" vs.
 * "show a skeleton") instead of this hook picking a default for them.
 */
export function useModulePermission(
  module: PermissionModule,
  action: PermissionAction = "view",
): { allowed: boolean; isLoading: boolean } {
  const roles = useSessionStore((s) => s.roles);
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const query = useMyWorkspacePermissionsQuery(workspaceId);

  // Global admin roles short-circuit without waiting on the workspace
  // matrix fetch at all — the query above still runs (cheap/cached, and
  // other consumers on the page likely need it too), it's just not on the
  // critical path for this particular check.
  if (isAdmin(roles)) {
    return { allowed: true, isLoading: false };
  }

  return {
    allowed: canAccessModule(roles, query.data, module, action),
    isLoading: query.isLoading,
  };
}
