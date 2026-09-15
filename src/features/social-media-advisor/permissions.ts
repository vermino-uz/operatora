import type { AppRole } from "@/types/entities";

/**
 * Page-level access for `/social-media-advisor`, ported from the old
 * frontend's `AuthContext.tsx#canViewPage()`. Unlike `/instructions` and
 * `/operators`, `"social-media-advisor"` never appears in ANY of that
 * function's per-role allowlists (sales_manager / finance_manager /
 * operator / the "no special role" fallback) — only the top-of-function
 * unconditional `super_admin`/`admin`/`demo_admin` early-return grants
 * access. Confirmed directly against `AuthContext.tsx` and the route
 * guard in `App.tsx` (`<ProtectedRoute requirePage="social-media-advisor">`).
 * So this page is effectively global-admin-only in the old app, not just
 * "manager-tier" — sales_manager is excluded too, unlike `/instructions`.
 */
export function canViewSocialMediaAdvisorPage(roles: AppRole[]): boolean {
  return roles.includes("super_admin") || roles.includes("admin") || roles.includes("demo_admin");
}
