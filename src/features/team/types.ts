/**
 * Team Members — traced from the old frontend's `OperatorUsersManager.tsx`/
 * `EditTeamMemberDialog.tsx` against the real backend
 * `auth-controller/admin-users/admin-users.controller.ts` (`/admin-users/*`)
 * — a *workspace*-scoped operator-management surface (permission enforced
 * inside the service via `assertCanManageWorkspaceUsers`, not a global-admin
 * gate), separate from `/admin-users` global admin console listing.
 */
export interface TeamMemberRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  workspace_role: string;
  is_owner: boolean;
  rbac_roles: string[];
  sip_count: number;
  status: "active" | "inactive";
  locked_until: string | null;
  last_login_at: string | null;
  joined_at: string;
  /** Legacy per-operator flags (`send_sms`/`delete_lead`/`edit_lead`/
   * `make_call`/`view_all_leads`) — superseded by the RBAC permission
   * matrix (Roles & Permissions section); not edited from this UI, see
   * PROGRESS.md's deferred list. */
  permissions: Record<string, boolean>;
  created_at: string | null;
}

export interface CreateOperatorInput {
  email: string;
  password: string;
  full_name?: string;
}

export interface UpdateOperatorInput {
  full_name?: string;
  phone?: string;
  status?: "active" | "inactive";
  password?: string;
  rbac_role_ids?: string[];
}

export interface TeamMembersFilters {
  q?: string;
  status?: "active" | "inactive";
}

/**
 * Derived display status — mirrors old frontend's `OperatorUsersManager`
 * `memberStatus()` exactly (not a real backend enum): `inactive` on the row
 * always renders as "deactivated"; a never-logged-in active row renders as
 * "invited"; anything else is "active". The old frontend's own comment
 * mentions a 4th "inactive" bucket but its actual `memberStatus()` function
 * only ever returns these 3 values — reproduced as-is, not invented.
 */
export type MemberDisplayStatus = "active" | "invited" | "deactivated";

export function memberDisplayStatus(member: Pick<TeamMemberRow, "status" | "last_login_at">): MemberDisplayStatus {
  if (member.status === "inactive") return "deactivated";
  if (!member.last_login_at) return "invited";
  return "active";
}

// ── SIP accounts (`/admin-users/operators/:userId/sip`) ────────────────────

export interface OperatorSipAccount {
  id: string;
  sip_number: string;
  server: string;
  transport_protocol: string;
  gsm_number: string;
  is_active: boolean;
  created_at: string;
  has_password: boolean;
  /** Returned so workspace admins can view/copy the saved credential —
   * confirmed via `mapOperatorSipPublic` in the backend service. */
  password?: string;
}

export interface UpsertOperatorSipInput {
  id?: string;
  sip_number?: string;
  password?: string;
  server?: string;
  transport_protocol?: string;
  gsm_number?: string;
}

// ── GSM lines (`/api/gsm`, scoped by `user_id` query param) ────────────────

export interface GsmLineRow {
  id: string;
  line_name: string | null;
  sim_number: string;
  sip_server: string;
  is_active?: boolean;
  has_password?: boolean;
  sip_password?: string;
}

export interface UpsertGsmLineInput {
  sip_server: string;
  sip_password?: string;
  sim_number: string;
  line_name?: string | null;
}

// ── SMS gateways (`/api/sms-gateways`, scoped by `user_id` query param) ────

export interface SmsGatewayRow {
  id: string;
  provider_name: string;
  sender_id: string;
  sms_port: number;
  base_url?: string | null;
  auth_username?: string | null;
  has_password?: boolean;
}

export interface UpsertSmsGatewayInput {
  provider_name: string;
  sender_id: string;
  sms_port: number;
  base_url?: string;
  auth_username?: string;
  auth_password?: string;
}

// ── Billing / operator seats (`/billing/me`, `/billing/operator-seat/*`) ───

export interface PlanLimits {
  calls_per_month: number | null;
  ai_chat_messages: number | null;
  ai_dashboards: number | null;
  custom_dashboards: number | null;
  image_generations: number | null;
  max_operators: number | null;
  storage_mb: number | null;
  storage_retention_days: number | null;
}

export interface BillingUsage {
  /** Live-metered SUM across every size-tracked table (conversations audio,
   * agent_knowledge_sources, product_files, generated_media,
   * telegram_messages) — see `plan-limits.service.ts`'s
   * `getStorageUsageBytes()`. Not a per-category breakdown; the backend
   * only exposes the aggregate. */
  storage_mb: number;
  /** Added for the Billing & Usage settings section (`GET /billing/me`'s
   * `usage.*` counters beyond storage) — optional because Team
   * Members/Storage only ever read `storage_mb`, and older cached query
   * data may not have these yet. */
  calls_per_month?: number;
  ai_chat_messages?: number;
  ai_dashboards?: number;
  custom_dashboards?: number;
  image_generations?: number;
}

export interface BillingFeatures {
  planSlug: "free" | "pro" | "max" | "corporate";
  planName: string;
  tier: string;
  status: string;
  access: "full" | "grace" | "read_only";
  limits: PlanLimits;
  usage: BillingUsage;
  extra_operator_seats: number;
  operator_seat_price_uzs: number | null;
  /** Workspace prepaid balance (UZS) — `GET /billing/me`'s `balance_uzs`. */
  balance_uzs: number;
  channels?: string[];
  agentic_mode?: boolean;
  periodKey?: string;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  graceEndsAt: string | null;
}

export interface RentOperatorSeatResponse {
  ok: boolean;
  workspaceId: string;
  status: "pending";
  plan_slug: string;
  quantity: number;
  unit_price_uzs: number;
  amount_uzs: number;
  transactionId: string;
  externalOrderId: string;
  payment_url: string | null;
  payme_url: string | null;
  click_url: string | null;
  paylov_url: string | null;
  paylov_invoice_id: number | null;
}

// ── Presence (`/presence/workspace`) ────────────────────────────────────────

export interface MemberPresence {
  online: boolean;
  last_seen: string | null;
}

export type WorkspacePresenceMap = Record<string, MemberPresence>;

// ── Activity summary (`/operator-activity/summary`) ─────────────────────────

export interface OperatorActivitySummary {
  active_seconds: number;
  idle_seconds: number;
  actions_count: number;
  last_ping_at: string | null;
}

export type OperatorActivitySummaryMap = Record<string, OperatorActivitySummary>;

/** Roles allowed to view teammates' presence/activity — mirrors the
 * backend's `VIEW_PRESENCE_ROLES`/`VIEW_ACTIVITY_ROLES` sets exactly
 * (`presence.controller.ts` / `operator-activity.controller.ts`), so the
 * client-side gate never shows a control the server would 403 anyway. */
export const VIEW_PRESENCE_ROLES = new Set([
  "workspace_owner",
  "workspace_admin",
  "owner",
  "admin",
  "manager",
  "sales_manager",
]);
