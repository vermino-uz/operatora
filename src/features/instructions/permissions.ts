import type { AppRole } from "@/types/entities";

/**
 * Page-level access for `/instructions`, ported from the old frontend's
 * `AuthContext.tsx#canViewPage()` — this page (like `/operators`, see
 * `features/operators/permissions.ts`) is gated purely by the caller's
 * *global* `roles[]` allowlist (`ProtectedRoute requirePage="instructions"`),
 * not the workspace RBAC matrix (`PermissionModule` has no `instructions`
 * entry, and none of the `instructions`/`quick_links` db-proxy rules check
 * workspace RBAC either — only the plain `writeRoles: MANAGER_ROLES` role
 * check on writes). This is a UX courtesy only.
 */
export function canViewInstructionsPage(roles: AppRole[]): boolean {
  if (roles.includes("super_admin") || roles.includes("admin") || roles.includes("demo_admin")) return true;
  if (roles.includes("finance_manager")) return false; // old allowlist excludes "instructions" for finance_manager
  // sales_manager, operator, and the "no special role" fallback all include "instructions" in the old allowlist.
  return true;
}

/**
 * Edit gating (create/update/delete/reorder instructions + quick links).
 * The old page hard-codes `canEditInstructions = isGlobalAdmin` (admin /
 * demo_admin / super_admin only) — it does NOT extend edit rights to
 * sales_manager even though the backend's `writeRoles: MANAGER_ROLES` on
 * both tables would technically allow it. Ported exactly as the old UI
 * behaved (stricter than the backend), not loosened to match the backend.
 */
export function canEditInstructions(roles: AppRole[]): boolean {
  return roles.includes("super_admin") || roles.includes("admin") || roles.includes("demo_admin");
}
