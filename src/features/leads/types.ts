/**
 * Leads Kanban board — core MVP scope (see PROGRESS.md for the full trace
 * and deferred-feature list). Traced from:
 *  - `leads-controller/lead-board/lead-board.controller.ts`/`.service.ts`
 *    (`GET /lead-board/:boardId` — columns + per-column counts/sums;
 *    `GET /lead-board/:boardId/column/:columnId` — paginated leads for one
 *    column, the endpoint the old frontend's `LeadColumn.tsx` actually
 *    calls, keyed `['column-leads', ...]` in its query cache).
 *  - `leads-controller/right-board-controller/right-board-controller.{controller,service}.ts`
 *    (`POST /right-board-controller/change-column` — move,
 *    `POST /right-board-controller/assign-operator` — reassign; both emit
 *    `lead_moved`/`lead_assigned` over the workspace realtime channel).
 *  - `leads-controller/leads/leads.controller.ts` (`GET /leads/:id` — full
 *    lead row + column, used by the details modal for a fresh read).
 */

/** `MARITAL_STATUS_OPTIONS`/`ACADEMIC_STATUS_OPTIONS` are hardcoded client
 * enums in the old frontend too (`LeadFilter.tsx`'s own
 * `maritalStatusOptions`/`academicStatusOptions`) — not fetched from any
 * endpoint, matched value-for-value here so filter values round-trip
 * against real `leads.marital_status`/`leads.academic_status` rows. */
export const MARITAL_STATUS_OPTIONS = ["Single", "Married", "Divorced", "Widowed"] as const;
export const ACADEMIC_STATUS_OPTIONS = ["High School", "Bachelor's", "Master's", "PhD", "Other"] as const;

/** `connected_channels` values — see `channelIcons.ts`'s doc comment for
 * why exactly these four and no others. */
export const LEAD_CHANNEL_OPTIONS = ["telegram", "instagram", "whatsapp", "sms"] as const;

/** `GET /lead-board/:boardId`'s and `.../column/:columnId`'s shared query
 * filters — traced from `lead-board.controller.ts`'s `buildFilters()`
 * (exact param names: `search`, `maritalStatus`, `academicStatus`,
 * `ageFrom`/`ageTo`, `dateFrom`/`dateTo`, `createdBy`, `channel`,
 * `assignedOperator`). Deliberately excludes `customFields` and
 * `formSource`, which the endpoint also accepts: `customFields` needs a
 * per-workspace custom-field-definition source that isn't built anywhere
 * in this app yet (no schema/labels to render a picker from), and
 * `formSource` needs a `forms` list the old frontend sources from a
 * lead-gen-forms feature this app hasn't built either — both would need a
 * real endpoint traced first rather than a client-side-only filter that
 * silently does nothing, see `ConversationFilters.tsx`'s identical
 * reasoning for omitting channel/sentiment there. */
export interface LeadFilters {
  search: string;
  maritalStatus: string;
  academicStatus: string;
  ageFrom: number | null;
  ageTo: number | null;
  dateFrom: string | null;
  dateTo: string | null;
  createdBy: string;
  channel: string;
  /** `"all" | "unassigned" | <operator user_id>` — matches the backend's
   * own default/sentinel values exactly (`assignedOperator ?? 'all'`). */
  assignedOperator: string;
}

export const EMPTY_LEAD_FILTERS: LeadFilters = {
  search: "",
  maritalStatus: "",
  academicStatus: "",
  ageFrom: null,
  ageTo: null,
  dateFrom: null,
  dateTo: null,
  createdBy: "",
  channel: "",
  assignedOperator: "all",
};

export function countActiveLeadFilters(filters: LeadFilters): number {
  let count = 0;
  if (filters.search) count++;
  if (filters.maritalStatus) count++;
  if (filters.academicStatus) count++;
  if (filters.ageFrom !== null) count++;
  if (filters.ageTo !== null) count++;
  if (filters.dateFrom) count++;
  if (filters.dateTo) count++;
  if (filters.createdBy) count++;
  if (filters.channel) count++;
  if (filters.assignedOperator !== "all") count++;
  return count;
}

export interface LeadBoardColumn {
  id: string;
  board_id: string;
  name: string;
  color: string | null;
  display_order: number;
  is_default?: boolean | null;
  is_hidden?: boolean | null;
  description?: string | null;
  /** WIP limit (Phase 2c-5) — max active (non-archived, non-sold, non-
   * soft-deleted) leads allowed in this column; `null`/undefined = unlimited.
   * Present on every board/column read (`select('*')` server-side), just not
   * typed here until this pass needed it. */
  lead_limit?: number | null;
  /** Set only on the two locked Sold/Rejected marker columns a board seeds
   * itself — never settable via `CreateColumnDto`/`UpdateColumnDto` (both
   * explicitly strip it server-side, see `ColumnsService.update()`).
   * Presence of this field is how the column-management UI knows to hide
   * edit/delete/reorder affordances for these two columns. */
  special_stage_kind?: string | null;
}

/** `GET /lead-board/:boardId` response — columns with per-column counts,
 * not leads inline (leads are fetched per-column, paginated, separately). */
export interface LeadBoardData {
  columns: LeadBoardColumn[];
  counts: Record<string, number>;
  sums: Record<string, number>;
  sumFieldName: string | null;
  sumFieldCurrency: string | null;
}

/** A single lead row — fields confirmed present on both the column-leads
 * list response (`leads.*` + `column:leads_columns(id,name,color)` +
 * `operators(operator_name, profile_id)`) and `GET /leads/:id`. Only the
 * fields this MVP's card/details view actually renders are typed;
 * `custom_fields` stays a loose record since its shape is workspace-defined
 * (see `lead_custom_fields` — full custom-field-aware rendering is out of
 * scope for this pass, see PROGRESS.md's deferred list). */
export interface LeadRow {
  id: string;
  workspace_id?: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  email?: string | null;
  age?: number | null;
  marital_status?: string | null;
  academic_status?: string | null;
  custom_fields: Record<string, unknown> | null;
  created_at: string;
  created_by?: string | null;
  deadline?: string | null;
  column_id: string;
  assigned_operator_id?: string | null;
  assigned_to?: string | null;
  connected_channels?: string[] | null;
  /** Present on every `select('*')` read server-side (confirmed in
   * `prisma/schema.prisma`'s `leads` model); typed here for the
   * `last_edited_time` computed custom-field type (Phase 2c-6), which
   * derives from this rather than `created_at`. */
  updated_at?: string;
  column?: { id: string; name: string; color?: string | null; board_id?: string } | null;
  operators?: { operator_name: string | null; profile_id: string | null } | null;

  /** Sold/Rejected/Archived/Trash metadata — attached server-side only on
   * the respective list endpoint's response (see `services/api/leads.ts`'s
   * `soldLeadsApi`/`rejectedLeadsApi`/`archivedLeadsApi`/`trashApi` doc
   * comments for exactly which endpoint populates which of these). A given
   * `LeadRow` only ever has the subset relevant to the tab it came from. */
  sold?: boolean;
  sold_at?: string | null;
  sold_note?: string | null;
  sold_by_profile?: { full_name: string | null; email: string | null } | null;
  rejected?: boolean;
  rejected_at?: string | null;
  rejected_reason?: string | null;
  rejected_by_profile?: { full_name: string | null; email: string | null } | null;
  archived?: boolean;
  archived_at?: string | null;
  archived_note?: string | null;
  archived_by_profile?: { full_name: string | null; email: string | null } | null;
  deleted_at?: string | null;
  deleted_by_profile?: { full_name: string | null; email: string | null } | null;
}

/** The five fixed-order tabs this pass builds — see PROGRESS.md's "Leads —
 * tabs & list view" entry. Admin-configurable order/visibility (the old
 * frontend's `leads-tab-config`) is explicitly deferred; order here is
 * fixed and identical for every workspace. */
export const LEAD_TABS = [
  { id: "active", label: "Active" },
  { id: "sold", label: "Sold" },
  { id: "rejected", label: "Rejected" },
  { id: "archived", label: "Archived" },
  { id: "trash", label: "Trash" },
] as const;
export type LeadTab = (typeof LEAD_TABS)[number]["id"];

/** Kanban vs. table view — only meaningful for the `active` tab (every other
 * tab has no board/columns concept to render as a Kanban, so it's always
 * rendered as a table — see PROGRESS.md's deferred-scope note). */
export type LeadViewMode = "board" | "list";

/** Column-leads already excludes sold/rejected leads server-side (see
 * `lead-board.service.ts`'s `.eq('sold', false).eq('rejected', false)`), so
 * any deadline in the past on a lead actually visible on the board is a
 * real open-and-overdue lead — mirrors the old frontend's `isOverdue`
 * styling. A plain function (not inline in a component body) so the
 * `Date.now()` call doesn't trip `react-hooks/purity` — same pattern as
 * `TeamMembersPanel.tsx`'s `formatLastActive()`. */
export function isLeadOverdue(deadline: string | null | undefined): boolean {
  if (!deadline) return false;
  return new Date(deadline).getTime() < Date.now();
}

/** Up to two initials from an operator's name, for the assignee avatar
 * fallback (e.g. "Alex Reid" -> "AR"). */
export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

/** Mirrors the old frontend's `formatLeadName()` (`utils/leadName.ts`):
 * first+last name, falling back to the phone number, falling back to a
 * generic label — never an empty card title. */
export function formatLeadName(lead: Pick<LeadRow, "first_name" | "last_name" | "phone_number">): string {
  const name = [lead.first_name, lead.last_name].filter(Boolean).join(" ").trim();
  if (name) return name;
  if (lead.phone_number) return lead.phone_number;
  return "Unnamed lead";
}

// ============================================================================
// Lead details panel expansion (Phase 2c-4) — Comments/Timeline/Tags/
// Conversations/SMS/Tasks/Stats tabs + additional phone numbers. Each type
// below is traced against a real backend contract; see the doc comment on
// the corresponding `services/api/lead*.ts` export for the exact
// controller/service/table read.
// ============================================================================

/** `leads-comments.controller.ts`'s `lead_comments` row + attached author
 * profile (`profile: {id, full_name, email} | null`, joined server-side in
 * `getCommentsByLead`). `images` is the raw jsonb column (array of public
 * attachment URLs) — renamed here for clarity, same data. */
export interface LeadComment {
  id: string;
  lead_id: string;
  content: string;
  images: string[] | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  profile: { id: string; full_name: string | null; email: string | null } | null;
}

/** `lead-stats.controller.ts`'s live-aggregated counters — every field is
 * exactly what `LeadStatsService.getLeadStats()` returns, nothing added. */
export interface LeadStats {
  days_in_pipeline: number;
  is_closed: boolean;
  calls_count: number;
  tasks_closed: number;
  tasks_overdue: number;
  notes_count: number;
  client_chats_count: number;
  internal_mentions_count: number;
  checklist_total: number;
  checklist_filled: number;
}

/** `leads.controller.ts`'s `/leads/:id/phones` — additional labeled numbers
 * (mother, director, ...), distinct from the lead's own primary
 * `phone_number`. */
export interface LeadPhone {
  id: string;
  lead_id: string;
  label: string | null;
  phone_number: string;
  is_primary: boolean;
  created_at: string;
}

/** Workspace tag catalog row — `lead_tags` table via the db-proxy (see
 * `services/api/leadTags.ts`). `color` is a hex string, free-form (the old
 * frontend's own `TAG_COLORS` palette, not a server-enforced enum). */
export interface LeadTag {
  id: string;
  name: string;
  color: string;
}

/** `lead_lifecycle_events` — immutable, DB-triggered stage/lifecycle
 * journal, read-only via the db-proxy (`table-registry.ts`: `readOnly: true`).
 * Field set matches the old frontend's `fetchLeadLifecycleEvents()` exactly
 * (`lib/leadLifecycleEvents.ts`, read for reference only). */
export type LeadLifecycleEventType =
  | "created"
  | "stage_changed"
  | "sold"
  | "sale_reopened"
  | "archived"
  | "unarchived"
  | "trashed"
  | "restored"
  | "legacy_snapshot";

export interface LeadLifecycleEvent {
  id: string;
  event_seq: number | string;
  workspace_id: string;
  lead_id: string;
  event_type: LeadLifecycleEventType;
  from_column_id: string | null;
  to_column_id: string | null;
  from_board_id: string | null;
  to_board_id: string | null;
  from_board_name: string | null;
  to_board_name: string | null;
  from_stage_name: string | null;
  to_stage_name: string | null;
  sold: boolean;
  archived: boolean;
  deleted: boolean;
  actor_id: string | null;
  occurred_at: string;
  recorded_at: string;
  is_inferred: boolean;
  history_complete: boolean;
}

/** Human-readable title/detail for one lifecycle event — a plain function
 * (English only; the old frontend's version is i18next-driven, this app has
 * no lead-feature i18n layer yet) so `LeadTimelineTab` doesn't reimplement
 * this switch. `operatorName` resolves `actor_id` via the caller's own
 * Team Members lookup (this function has no data access itself). */
export function describeLeadLifecycleEvent(
  event: LeadLifecycleEvent,
  operatorName: string | null,
): { title: string; detail: string } {
  const stageLabel = (board: string | null, stage: string | null) => {
    const s = stage?.trim() || "unknown stage";
    return board?.trim() ? `${board.trim()} / ${s}` : s;
  };
  const from = stageLabel(event.from_board_name, event.from_stage_name);
  const to = stageLabel(event.to_board_name, event.to_stage_name);
  const by = operatorName ? ` by ${operatorName}` : "";

  switch (event.event_type) {
    case "created":
      return { title: "Lead created", detail: `Created in ${to}${by}` };
    case "stage_changed":
      return { title: "Stage changed", detail: `Moved from ${from} to ${to}${by}` };
    case "sold":
      return { title: "Marked sold", detail: `At ${to}${by}` };
    case "sale_reopened":
      return { title: "Sale reopened", detail: `At ${to}${by}` };
    case "archived":
      return { title: "Archived", detail: `At ${to}${by}` };
    case "unarchived":
      return { title: "Restored from Archive", detail: `At ${to}${by}` };
    case "trashed":
      return { title: "Moved to Trash", detail: `At ${to}${by}` };
    case "restored":
      return { title: "Restored from Trash", detail: `At ${to}${by}` };
    case "legacy_snapshot":
    default:
      return { title: "Current state", detail: `At ${to} (inferred from a snapshot, earlier history unavailable)` };
  }
}

/** `tasks.controller.ts`'s `operator_tasks` row (`GET /tasks?lead_id=`
 * returns every task ever tied to a lead, any assignee/status — see that
 * controller's own summary). `leads` is the joined `{id,first_name,
 * last_name,phone_number}` the service attaches — always redundant with the
 * lead this tab is already scoped to, so `LeadTasksTab` never renders it. */
export type LeadTaskType = "call" | "send_info" | "meeting" | "check_payment" | "custom" | "system";
export type LeadTaskStatus = "pending" | "completed" | "cancelled";

export interface LeadTask {
  id: string;
  workspace_id: string;
  lead_id: string | null;
  assigned_to: string | null;
  assigned_operator_id: string | null;
  created_by: string;
  title: string;
  task_type: LeadTaskType;
  source: string;
  status: LeadTaskStatus;
  due_at: string;
  completed_at: string | null;
  closure_comment: string | null;
  created_at: string;
  updated_at: string;
  is_overdue: boolean;
}

/** `lead_sms_messages` (Prisma `schema.prisma`) via the db-proxy — one row
 * per outbound SMS actually sent to this lead, with delivery status.
 * Read-only from this tab (compose is a separate slice, 2c-8 — see
 * `LeadSmsTab`'s doc comment). */
export type LeadSmsStatus = "queued" | "sent" | "delivered" | "failed" | string;

export interface LeadSmsMessage {
  id: string;
  lead_id: string;
  sender_id: string;
  template_id: string | null;
  reason_tag: string;
  message_body: string;
  phone_number: string;
  status: LeadSmsStatus;
  provider_message_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

// ============================================================================
// SMS templates + compose (Phase 2c-8) — real contract traced against
// `eskiz.controller.ts`/`eskiz.service.ts`, see `services/api/eskizSms.ts`'s
// header comment for why this, not `lead_sms_templates`/`lead_sms_messages`.
// ============================================================================

export type EskizTemplateStatus = "moderation" | "approved" | "rejected";

/** `eskiz_templates` row. No `name`/`language`/`variables`/`reason_tag`
 * fields exist — Eskiz moderates the literal `content` string, so there is
 * no template metadata beyond the text itself and its moderation status. */
export interface EskizTemplate {
  id: string;
  workspace_id: string;
  account_id: string;
  content: string;
  eskiz_template_id: number | null;
  status: EskizTemplateStatus;
  submitted_at: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

/** `GET /eskiz/account`'s public (no-credentials) shape. */
export interface EskizAccount {
  id: string;
  email: string | null;
  sender_id: string | null;
  balance_uzs: number | null;
  balance_synced_at: string | null;
  is_active: boolean;
  connection_status: "connected" | "not_connected" | "token_expired" | "disconnected" | string;
}

export interface EskizGuidance {
  sms_price_uzs: number;
  low_balance_threshold_uzs: number;
}

export type EskizMessageStatus = "pending" | "waiting" | "sent" | "delivered" | "failed" | "expired" | "rejected" | string;

/** `eskiz_messages` row — one per outbound SMS, delivery status updated
 * asynchronously by Eskiz's webhook. */
export interface EskizMessage {
  id: string;
  workspace_id: string;
  chat_id: string;
  template_id: string | null;
  text: string;
  status: EskizMessageStatus;
  eskiz_message_id: string | null;
  error_message: string | null;
  status_updated_at: string | null;
  created_at: string;
}

/** `POST /eskiz/send/bulk`'s response — the backend's own pre-send estimate
 * (recipient count already resolved and balance already checked server-side
 * before the 201 comes back); sending itself continues in the background. */
export interface EskizBulkSendResult {
  total: number;
  estimated_cost_uzs: number;
  balance_uzs: number;
  started: boolean;
}

/** Free-text variable tokens the *old* frontend's now-unused
 * `lead_sms_templates` engine supported (`LeadSMSTemplatesDialog.tsx`),
 * kept here only as convenience "insert" buttons for the optional `text`
 * override on a single-lead compose — Eskiz does not interpret `{{...}}`
 * syntax itself, so this is a client-side substitution preview only, and
 * the resulting text must still structurally match the approved template or
 * Eskiz will reject the send (surfaced as a normal error, not silently). */
export const SMS_OVERRIDE_VARIABLES = [
  { token: "{{lead_first_name}}", label: "First name" },
  { token: "{{lead_last_name}}", label: "Last name" },
  { token: "{{lead_phone}}", label: "Phone" },
  { token: "{{operator_name}}", label: "Operator" },
  { token: "{{company_name}}", label: "Company" },
] as const;

export function resolveSmsVariables(
  text: string,
  vars: { lead_first_name: string; lead_last_name: string; lead_phone: string; operator_name: string; company_name: string },
): string {
  return text
    .replaceAll("{{lead_first_name}}", vars.lead_first_name)
    .replaceAll("{{lead_last_name}}", vars.lead_last_name)
    .replaceAll("{{lead_phone}}", vars.lead_phone)
    .replaceAll("{{operator_name}}", vars.operator_name)
    .replaceAll("{{company_name}}", vars.company_name);
}

/** A `conversations` row linked to a lead via `conversations.entities`
 * (jsonb array containing `{lead_id}`) — see `services/api/leadConversationLinks.ts`'s
 * doc comment for why this is resolved client-side rather than via a
 * server-side filter. Trimmed to what the tab renders. */
export interface LeadLinkedConversation {
  id: string;
  client_name: string;
  client_phone: string | null;
  conversation_date: string;
  conversation_time: string;
  status: string | null;
  ai_score: number | null;
  sentiment: string | null;
  entities: unknown;
}

// ============================================================================
// Column/board management (Phase 2c-5) — WIP limits, guided required-field/
// deadline gate dialog, board create/share.
// ============================================================================

/** Purely presentational metadata for `RequireFieldDialog` — which input
 * widget to render for a given `FIELD_REQUIRED:<field>` name. Mirrors the
 * backend's own `BUILTIN_LEAD_COLUMNS` set (`automation-gates.util.ts`) for
 * field *names* only (which names are real `leads` columns) — the actual
 * gate-evaluation logic (which fields are required for which column) stays
 * entirely server-side and is never reproduced here; this is just "how do we
 * label/render an input for a field name the server already told us is
 * missing", not a duplicate of the gate itself. Any field name not in this
 * map is now (Phase 2c-6) looked up against the workspace's real
 * `lead_custom_fields` definitions (`useLeadCustomFieldsQuery`) and rendered
 * with the correct type-aware widget via `CustomFieldInput` — free text is
 * only the fallback if no matching definition exists (e.g. a field an
 * automation rule references by name that was since deleted). */
export const BUILTIN_LEAD_FIELD_META: Record<
  string,
  { label: string; input: "text" | "number" | "select" | "operator" | "deadline"; options?: readonly string[] }
> = {
  first_name: { label: "First name", input: "text" },
  last_name: { label: "Last name", input: "text" },
  phone_number: { label: "Phone number", input: "text" },
  age: { label: "Age", input: "number" },
  marital_status: { label: "Marital status", input: "select", options: MARITAL_STATUS_OPTIONS },
  academic_status: { label: "Academic status", input: "select", options: ACADEMIC_STATUS_OPTIONS },
  deadline: { label: "Deadline", input: "deadline" },
  assigned_operator_id: { label: "Assigned operator", input: "operator" },
};

/** `GET /boards/:id/share` response — `board.service.ts`'s
 * `getShareSettings()`. `hasPassword` is a boolean, never the hash itself. */
export interface LeadBoardShareSettings {
  enabled: boolean;
  hasPassword: boolean;
  token: string;
  expiresAt: string | null;
}

/** Public, unauthenticated share snapshot — `GET /public/boards/:token`
 * (`board.service.ts`'s `getPublicBoard()`). Deliberately narrower than
 * `LeadRow`/`LeadBoardColumn` — only the fields the backend actually selects
 * for this read-only public view. */
export interface PublicLeadBoardSnapshot {
  board: { id: string; name: string };
  columns: { id: string; name: string; color: string | null; display_order: number }[];
  leads: {
    id: string;
    column_id: string;
    first_name: string | null;
    last_name: string | null;
    phone_number: string | null;
    age: number | null;
    marital_status: string | null;
    academic_status: string | null;
    custom_fields: Record<string, unknown> | null;
    display_order: number | null;
    deadline: string | null;
    created_at: string;
  }[];
}
