"use client";

import { useSessionStore } from "@/state/session-store";
import { hasAnyRole } from "@/auth/permissions";
import type { AppRole } from "@/types/entities";

/** Convenience hook wrapping `hasAnyRole` against the current session's
 * global roles[]. Workspace-scoped permission checks (per-tenant
 * `role`/`permissions`) need the workspace membership data explicitly —
 * this hook only covers the global RBAC dimension. */
export function usePermission(required: AppRole[]): boolean {
  const roles = useSessionStore((s) => s.roles);
  return hasAnyRole(roles, required);
}
