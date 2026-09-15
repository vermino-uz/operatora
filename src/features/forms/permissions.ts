import { MANAGER_ROLES, hasAnyRole } from "@/auth/permissions";
import type { AppRole } from "@/types/entities";

/**
 * Page-level access for the `/forms` BUILDER (distinct from the public
 * `/form/[formId]` submission view), ported from the old frontend's
 * `AuthContext.tsx#canViewPage("forms")` — same pattern already used for
 * `/instructions` (see `features/instructions/permissions.ts`). Global
 * `roles[]` allowlist only; the workspace RBAC matrix has no `forms`
 * module. UX courtesy only — the backend (db-proxy `writeRoles`, see
 * `canEditForms` below) is the real authorization boundary for writes.
 *
 * Old allowlist: super_admin/admin/demo_admin → always; sales_manager →
 * included; finance_manager → NOT included; operator → NOT included;
 * default (no special role) → included.
 */
export function canViewFormsPage(roles: AppRole[]): boolean {
  if (roles.includes("super_admin") || roles.includes("admin") || roles.includes("demo_admin")) return true;
  if (roles.includes("sales_manager")) return true;
  if (roles.includes("finance_manager")) return false;
  if (roles.includes("operator")) return false;
  return true;
}

/**
 * Create/edit/delete gating. The db-proxy's `forms` table rule
 * (`table-registry.ts`) sets `writeRoles: MANAGER_ROLES` — mirrored exactly
 * here rather than loosened, since a default-role or `finance_manager`
 * caller who can nonetheless see the page (per `canViewFormsPage` above,
 * for the roles that can) would otherwise get a confusing 403 from an
 * enabled-looking button.
 */
export function canEditForms(roles: AppRole[]): boolean {
  return hasAnyRole(roles, MANAGER_ROLES);
}
