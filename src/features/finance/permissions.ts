import { ADMIN_ROLES, hasAnyRole, MANAGER_ROLES } from "@/auth/permissions";
import type { AppRole } from "@/types/entities";

/**
 * Page-level access for `/finance`, ported verbatim from the old frontend's
 * `AuthContext.tsx#canViewPage("finance")`. This allowlist is narrower and
 * DIFFERENT in shape from every other page-permission helper in this repo
 * (`canViewFormsPage`, `canViewInstructionsPage`, ...): finance is the ONE
 * page `sales_manager`/`operator`/default-role accounts do NOT get, while
 * `finance_manager` — a role that can't see almost anything else — gets
 * this one. Confirmed by reading the function directly:
 * `if (userRoles.includes('finance_manager')) return ['dashboard',
 * 'finance', 'messages'].includes(page);` with no `finance` entry in any
 * other branch (admin-tier roles bypass via their own unconditional
 * early-return).
 *
 * There is no workspace-RBAC `finance` module in `features/roles/types.ts`
 * (`PermissionModule` — confirmed by reading it directly), so unlike
 * `useModulePermission`-gated pages (e.g. `ai_dashboards`), this stays a
 * pure global-role check via `usePermission`/`hasAnyRole`, same mechanism
 * `canViewFormsPage`/`canViewInstructionsPage` already use for their own
 * page-level (non-workspace-RBAC) allowlists.
 */
export function canViewFinancePage(roles: AppRole[]): boolean {
  return hasAnyRole(roles, [...ADMIN_ROLES, "finance_manager"]);
}

/**
 * Write gating for `courses`/`groups`/`group_users`/`clients` — mirrors the
 * db-proxy's `writeRoles: MANAGER_ROLES` on those tables (`table-registry.ts`)
 * exactly. Notably this does NOT include `finance_manager` — the backend
 * reserves course/group structure edits to admin-tier + `sales_manager`,
 * and reserves the money-movement tables (below) to `finance_manager`
 * instead. UX courtesy only; the backend remains the real boundary.
 */
export function canManageFinanceStructure(roles: AppRole[]): boolean {
  return hasAnyRole(roles, MANAGER_ROLES);
}

/**
 * Write gating for `payments`/`expenses`/`expense_categories` — mirrors the
 * db-proxy's `writeRoles: ['finance_manager', ...ADMIN_ROLES]` on those
 * tables exactly (`table-registry.ts`). `sales_manager` can view/manage
 * course & group structure above but NOT record money movements.
 */
export function canManageFinanceRecords(roles: AppRole[]): boolean {
  return hasAnyRole(roles, [...ADMIN_ROLES, "finance_manager"]);
}
