import type { AppRole } from "@/types/entities";

/**
 * Page-level access for `/operators` and `/operator-feedbacks`, ported
 * from the old frontend's `AuthContext.tsx#canViewPage()` — these two
 * pages are gated purely by the caller's *global* `roles[]` allowlist
 * (`ProtectedRoute requirePage="operators"` / `requirePage=
 * "operator-feedbacks"`, no `requireModule` alongside it), NOT the
 * workspace RBAC matrix (`PermissionModule` has no `operators` entry —
 * confirmed, this page predates that matrix and was never migrated onto
 * it on the backend either: none of the `operators-page/*` GET
 * endpoints check workspace RBAC, only a plain `JwtAuthGuard`-equivalent
 * auth check). This is a UX courtesy only, same as every other
 * client-side gate — the backend's own admin/sales_manager checks on the
 * write endpoints remain the real authorization boundary.
 */
export function canViewOperatorsPage(roles: AppRole[]): boolean {
  if (roles.includes("super_admin") || roles.includes("admin") || roles.includes("demo_admin")) return true;
  if (roles.includes("finance_manager")) return false; // old allowlist for finance_manager excludes "operators"
  // sales_manager, operator, and the "no special role" fallback all include "operators" in the old allowlist.
  return true;
}

export function canViewOperatorFeedbacksPage(roles: AppRole[]): boolean {
  if (roles.includes("super_admin") || roles.includes("admin") || roles.includes("demo_admin")) return true;
  return roles.includes("operator");
}
