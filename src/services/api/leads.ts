import { apiFetch } from "@/services/api/client";
import type {
  LeadBoardColumn,
  LeadBoardData,
  LeadComment,
  LeadFilters,
  LeadPhone,
  LeadRow,
  LeadStats,
} from "@/features/leads/types";

/** Shared query-string builder for `GET /lead-board/:boardId` and
 * `.../column/:columnId` — both accept the exact same filter param set
 * (see `LeadFilters`'s doc comment). Omits a param entirely when empty
 * rather than sending an empty string, matching the backend's own
 * `query.x || ''`/`query.x || 'all'` fallbacks. */
function appendLeadFilterParams(qs: URLSearchParams, filters?: LeadFilters): void {
  if (!filters) return;
  if (filters.search) qs.set("search", filters.search);
  if (filters.maritalStatus) qs.set("maritalStatus", filters.maritalStatus);
  if (filters.academicStatus) qs.set("academicStatus", filters.academicStatus);
  if (filters.ageFrom !== null) qs.set("ageFrom", String(filters.ageFrom));
  if (filters.ageTo !== null) qs.set("ageTo", String(filters.ageTo));
  if (filters.dateFrom) qs.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) qs.set("dateTo", filters.dateTo);
  if (filters.createdBy) qs.set("createdBy", filters.createdBy);
  if (filters.channel) qs.set("channel", filters.channel);
  if (filters.assignedOperator && filters.assignedOperator !== "all") {
    qs.set("assignedOperator", filters.assignedOperator);
  }
}

/**
 * Leads Kanban board — real, non-narrow data layer (superseding
 * `leadsBoards.ts`'s deliberately minimal board/column picker for this
 * feature's own reads/writes; see that file's doc comment). Traced against
 * the real backend contract — see `features/leads/types.ts`'s header
 * comment for the exact controllers/services read.
 */
export interface ColumnLeadsPage {
  leads: LeadRow[];
  totalCount: number;
  page: number;
  perPage: number;
}

export const leadsApi = {
  /** `GET /lead-board/:boardId` — columns + per-column lead counts (no
   * lead rows inline; those are fetched per-column below). `filters` is
   * accepted here too — the backend applies the same filter set to the
   * count query, so counts reflect the active filters rather than the
   * unfiltered total. */
  async getBoardData(boardId: string, filters?: LeadFilters): Promise<LeadBoardData> {
    const qs = new URLSearchParams();
    appendLeadFilterParams(qs, filters);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return apiFetch<LeadBoardData>(`/lead-board/${encodeURIComponent(boardId)}${suffix}`);
  },

  /** `GET /lead-board/:boardId/column/:columnId?page=&pageSize=&...` — the
   * endpoint the old frontend's `LeadColumn.tsx` actually calls for card
   * data, paginated server-side (`{leads,totalCount,page,perPage}`, the
   * exact shape `normalizePaginated()` already understands). */
  async getColumnLeads(
    boardId: string,
    columnId: string,
    params: { page?: number; pageSize?: number } = {},
    filters?: LeadFilters,
  ): Promise<ColumnLeadsPage> {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.pageSize) qs.set("pageSize", String(params.pageSize));
    appendLeadFilterParams(qs, filters);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return apiFetch<ColumnLeadsPage>(
      `/lead-board/${encodeURIComponent(boardId)}/column/${encodeURIComponent(columnId)}${suffix}`,
    );
  },

  /** `GET /leads/:id` — full lead row + column, used for a fresh read when
   * the details modal opens (the card's own cached row is used as the
   * initial/fallback view so the modal never opens blank). */
  async getLead(id: string): Promise<LeadRow> {
    return apiFetch<LeadRow>(`/leads/${encodeURIComponent(id)}`);
  },

  /** `POST /right-board-controller/change-column` — move one lead to a
   * different column. Single-lead selection only (see `moveLeadsBulk` below
   * for the multi-select variant added in Phase 2c-3 — same endpoint, the
   * backend already accepted an array in `selectedLeads`, confirmed
   * directly in `right-board-controller.controller.ts`/`.service.ts`
   * before adding a second client-side wrapper). */
  async moveLead(leadId: string, columnId: string): Promise<{ success: true }> {
    return apiFetch<{ success: true }>(`/right-board-controller/change-column`, {
      method: "POST",
      body: { selectedLeads: [leadId], columnId },
    });
  },

  /** Row-selection bulk move — same `change-column` endpoint as `moveLead`,
   * `selectedLeads` sent as the real multi-id array (already bulk-capable
   * server-side; same-board only, enforced server-side with a clear `400`
   * on a cross-board attempt — see that service's own comment). */
  async moveLeadsBulk(leadIds: string[], columnId: string): Promise<{ success: true }> {
    return apiFetch<{ success: true }>(`/right-board-controller/change-column`, {
      method: "POST",
      body: { selectedLeads: leadIds, columnId },
    });
  },

  /** `POST /right-board-controller/assign-operator` — assign or unassign
   * (`operatorId: null`) a single lead. Accepts either an `operators.id`
   * or a `profiles.id` (the backend resolves both) — this app passes the
   * Team Members `user_id` (profile id), consistent with Lead Automations'
   * operator picker (see PROGRESS.md). */
  async assignOperator(leadId: string, operatorId: string | null): Promise<{ success: true; assigned_operator_id: string | null }> {
    return apiFetch<{ success: true; assigned_operator_id: string | null }>(
      `/right-board-controller/assign-operator`,
      { method: "POST", body: { selectedLeads: [leadId], operatorId } },
    );
  },

  /** Row-selection bulk assign — same endpoint, real array `selectedLeads`.
   * If any selected lead is already assigned to someone else, the whole
   * call 403s (all-or-nothing, enforced server-side) unless the caller is
   * the current assignee or a workspace owner/admin — surfaced via
   * `leadActionErrorMessage`, not silently partial. */
  async assignOperatorBulk(leadIds: string[], operatorId: string | null): Promise<{ success: true; assigned_operator_id: string | null }> {
    return apiFetch<{ success: true; assigned_operator_id: string | null }>(
      `/right-board-controller/assign-operator`,
      { method: "POST", body: { selectedLeads: leadIds, operatorId } },
    );
  },

  /** `POST /right-board-controller/delete-leads` — soft-delete (into Trash)
   * one or more leads by id, real bulk endpoint (`selectedLeads: string[]`),
   * distinct from the single-lead `DELETE /leads/:id` used elsewhere in this
   * feature (same underlying soft-delete, just the array-shaped sibling
   * endpoint the old frontend's row-selection bulk toolbar actually calls —
   * confirmed directly in `right-board-controller.controller.ts`). */
  async deleteLeadsBulk(leadIds: string[]): Promise<{ success: true }> {
    return apiFetch<{ success: true }>(`/right-board-controller/delete-leads`, {
      method: "POST",
      body: { selectedLeads: leadIds },
    });
  },

  /** `GET /leads-list` (`leads-list.controller.ts`) — the whole-board,
   * paginated, cross-column list the Active tab's List (table) view uses,
   * distinct from `getColumnLeads` (one column at a time, for the Kanban
   * view). 1-indexed `page` (unlike `getColumnLeads`'s 0-indexed one — traced
   * directly from the controller's own `Math.max(1, Math.trunc(page))`).
   * `selectedColumns` (the old frontend's `BoardColumnFilter`) isn't wired
   * this pass — see PROGRESS.md. */
  async getLeadsList(
    boardId: string,
    params: { page?: number; pageSize?: number } = {},
    filters?: LeadFilters,
  ): Promise<{ data: LeadRow[]; count: number }> {
    const qs = new URLSearchParams({ boardId });
    if (params.page) qs.set("page", String(params.page));
    if (params.pageSize) qs.set("pageSize", String(params.pageSize));
    if (filters) qs.set("filters", JSON.stringify(filtersToLeadListFilters(filters)));
    return apiFetch<{ data: LeadRow[]; count: number }>(`/leads-list?${qs.toString()}`);
  },

  /** `DELETE /leads/:id` (`leads.controller.ts`) — soft-delete into Trash;
   * requires an admin/sales_manager role or `leads/delete` workspace
   * permission (backend-enforced, see the controller's own summary). Used
   * from the Sold tab's row menu, matching the old frontend's
   * `SoldLeadsList.tsx` "permanently delete" action (misleadingly named
   * there — it's actually the same soft-delete-to-Trash as everywhere
   * else, confirmed directly in `leads.service.ts`'s `remove()`). */
  async deleteLead(leadId: string): Promise<{ success: true }> {
    return apiFetch<{ success: true }>(`/leads/${encodeURIComponent(leadId)}`, { method: "DELETE" });
  },

  /** `GET /add-lead/columns?boardId=` (`add-lead.controller.ts`) — the
   * column picker the Create Lead dialog actually uses, distinct from
   * `getBoardData`'s columns: this one excludes the locked Sold/Rejected
   * marker columns server-side (`special_stage_kind` filter) since a new
   * lead can never start out already sold/rejected — traced directly in
   * `add-lead.service.ts`'s `getColumns()`, not reused from the board
   * response, which doesn't apply that filter. */
  async getAddLeadColumns(boardId: string): Promise<LeadBoardColumn[]> {
    return apiFetch<LeadBoardColumn[]>(`/add-lead/columns?boardId=${encodeURIComponent(boardId)}`);
  },

  /** `POST /add-lead` (`add-lead.controller.ts`/`.service.ts`) — create a
   * new lead. `custom_fields` (Phase 2c-6) is sent when the create-lead
   * form has any custom fields filled in — the DTO field isn't validated
   * server-side (no class-validator decorator on it, defaults to `{}` in
   * the service if omitted), but real, since it's simply stored as-is on
   * the new row, same as every other `custom_fields` write path in this
   * feature. `created_by` is also omitted —
   * the service always uses the authenticated caller's id server-side and
   * ignores whatever the DTO carries. A `400` with
   * `{code: 'DUPLICATE_LEAD', existingLead}` means a lead with this phone
   * number already exists in the workspace (blocks creation, doesn't
   * silently dedupe) — surfaced via `ApiError.code`. */
  async createLead(payload: CreateLeadPayload): Promise<LeadRow> {
    return apiFetch<LeadRow>(`/add-lead`, { method: "POST", body: payload });
  },

  /** `PATCH /leads/:id` (`leads.controller.ts`/`.service.ts`) — generic
   * field patch. `UpdateLeadDto` only formally declares `name`/`phone`/
   * `email`/`sold`/`archived`/`custom_fields`, but the service forwards the
   * whole body straight to Supabase's `.update()` with no whitelist
   * stripping (confirmed directly in `LeadsService.update()`) — so any real
   * `leads` column (`marital_status`, `academic_status`, `first_name`,
   * `last_name`, `age`, `assigned_operator_id`, ...) can be set this way
   * too. Used by `RequireFieldDialog` (Phase 2c-5) to resolve a
   * `FIELD_REQUIRED:<field>` gate failure for any field other than
   * `deadline` (which has its own dedicated endpoint, see
   * `services/api/leadDeadline.ts`). Requires `leads/edit` permission,
   * enforced server-side (a 403 surfaces via `leadActionErrorMessage`). */
  async patchLead(leadId: string, patch: Record<string, unknown>): Promise<LeadRow> {
    return apiFetch<LeadRow>(`/leads/${encodeURIComponent(leadId)}`, { method: "PATCH", body: patch });
  },
};

/** `POST /add-lead` request body — see `leadsApi.createLead`'s doc comment
 * for which DTO fields are deliberately omitted. */
export interface CreateLeadPayload {
  first_name: string;
  last_name?: string;
  phone_number?: string;
  age?: number;
  marital_status?: string;
  academic_status?: string;
  column_id: string;
  workspace_id: string;
  custom_fields?: Record<string, unknown>;
}

/** `LeadFilters` (this app's Active-tab/Kanban filter state) and the
 * `leads-list`/`rejected-leads-list`/`archived-leads-list` endpoints'
 * `filters=` JSON param use the exact same field names (confirmed directly
 * in `leads-list-filters.util.ts`'s `LeadListFilters` type) — this just
 * drops the client-only `null`/`"all"`/`""` sentinels the backend doesn't
 * expect. */
export function filtersToLeadListFilters(filters: LeadFilters): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (filters.search) out.search = filters.search;
  if (filters.maritalStatus) out.maritalStatus = filters.maritalStatus;
  if (filters.academicStatus) out.academicStatus = filters.academicStatus;
  if (filters.ageFrom !== null) out.ageFrom = filters.ageFrom;
  if (filters.ageTo !== null) out.ageTo = filters.ageTo;
  if (filters.dateFrom) out.dateFrom = filters.dateFrom;
  if (filters.dateTo) out.dateTo = filters.dateTo;
  if (filters.createdBy) out.createdBy = filters.createdBy;
  if (filters.channel) out.channel = filters.channel;
  if (filters.assignedOperator && filters.assignedOperator !== "all") out.assignedOperator = filters.assignedOperator;
  return out;
}

/**
 * Sold tab — `sold-leads-list.controller.ts`. No pagination, no server-side
 * filters (confirmed: the controller only accepts `boardId`) — matches the
 * old frontend's `SoldLeadsList.tsx`, which filters client-side over the
 * full unfiltered response; this pass doesn't reproduce that client-side
 * filtering (see PROGRESS.md), just the real list + restore.
 */
export const soldLeadsApi = {
  async getColumns(boardId: string): Promise<LeadBoardColumn[]> {
    return apiFetch<LeadBoardColumn[]>(`/sold-leads-list/columns?boardId=${encodeURIComponent(boardId)}`);
  },
  async list(boardId: string): Promise<LeadRow[]> {
    return apiFetch<LeadRow[]>(`/sold-leads-list?boardId=${encodeURIComponent(boardId)}`);
  },
  async restore(leadId: string): Promise<{ success: true }> {
    return apiFetch<{ success: true }>(`/sold-leads-list/${encodeURIComponent(leadId)}/restore`, { method: "PATCH" });
  },
  /** `PATCH /sold-leads-list/:id/mark-sold` — `{note?}`, optional free-text
   * note about the sale. Server-side gates the same deadline/required-field
   * automation rules as a regular column move (`FIELD_REQUIRED:...` message
   * on a `400`) — surfaced as a generic inline error, not the old
   * frontend's guided `RequireFieldDialog` follow-up (same deferred-scope
   * call as the Kanban board's column-move gate, see PROGRESS.md). */
  async markSold(leadId: string, note?: string): Promise<LeadRow> {
    return apiFetch<LeadRow>(`/sold-leads-list/${encodeURIComponent(leadId)}/mark-sold`, {
      method: "PATCH",
      body: { note: note?.trim() ? note.trim() : undefined },
    });
  },
};

/**
 * Rejected tab — `rejected-leads-list.controller.ts`. Paginated
 * (0-indexed `page`, fixed 100/page server-side — no `pageSize` param
 * exists on this endpoint, confirmed in the controller), same
 * `LeadFilters` shape as the board/list endpoints.
 */
export const rejectedLeadsApi = {
  async getColumns(boardId: string): Promise<LeadBoardColumn[]> {
    return apiFetch<LeadBoardColumn[]>(`/rejected-leads-list/columns?boardId=${encodeURIComponent(boardId)}`);
  },
  async list(boardId: string, page: number, filters?: LeadFilters): Promise<{ leads: LeadRow[]; count: number }> {
    const qs = new URLSearchParams({ boardId, page: String(page) });
    if (filters) qs.set("filters", JSON.stringify(filtersToLeadListFilters(filters)));
    return apiFetch<{ leads: LeadRow[]; count: number }>(`/rejected-leads-list?${qs.toString()}`);
  },
  async restore(leadId: string): Promise<{ success: true }> {
    return apiFetch<{ success: true }>(`/rejected-leads-list/${encodeURIComponent(leadId)}/restore`, { method: "PATCH" });
  },
  /** `PATCH /rejected-leads-list/:id/mark-rejected` — `{reason}`, mandatory
   * (confirmed directly in `rejected-leads-list.service.ts`'s
   * `markAsRejected()`: throws a `400` if `!reason?.trim()`). Same
   * deadline/required-field gate as `markSold` above. */
  async markRejected(leadId: string, reason: string): Promise<LeadRow> {
    return apiFetch<LeadRow>(`/rejected-leads-list/${encodeURIComponent(leadId)}/mark-rejected`, {
      method: "PATCH",
      body: { reason },
    });
  },
};

/**
 * Archived tab — `archived-leads-list.controller.ts`. Same pagination/
 * filter shape as Rejected. Only single-lead restore is wired this pass —
 * `restore-multiple`/`archive-multiple`/`archive-all` are real endpoints
 * too but belong to Phase 2c-3's bulk-actions slice (see PROGRESS.md).
 */
export const archivedLeadsApi = {
  async getColumns(boardId: string): Promise<LeadBoardColumn[]> {
    return apiFetch<LeadBoardColumn[]>(`/archived-leads-list/columns?boardId=${encodeURIComponent(boardId)}`);
  },
  async list(boardId: string, page: number, filters?: LeadFilters): Promise<{ leads: LeadRow[]; count: number }> {
    const qs = new URLSearchParams({ boardId, page: String(page) });
    if (filters) qs.set("filters", JSON.stringify(filtersToLeadListFilters(filters)));
    return apiFetch<{ leads: LeadRow[]; count: number }>(`/archived-leads-list?${qs.toString()}`);
  },
  async restore(leadId: string): Promise<{ success: true }> {
    return apiFetch<{ success: true }>(`/archived-leads-list/${encodeURIComponent(leadId)}/restore`, { method: "PATCH" });
  },
  /** `PATCH /archived-leads-list/restore-multiple` — real bulk endpoint,
   * body `{leadIds}`, wired for the Archived tab's row-selection bulk
   * restore (Phase 2c-3). */
  async restoreMultiple(leadIds: string[]): Promise<{ success: true }> {
    return apiFetch<{ success: true }>(`/archived-leads-list/restore-multiple`, {
      method: "PATCH",
      body: { leadIds },
    });
  },
  /** `PATCH /archived-leads-list/archive-multiple` — real bulk endpoint,
   * body `{leadIds, note?}`, excludes already-sold leads server-side. Used
   * for the Active tab's row-selection "Archive selected" bulk action
   * (Phase 2c-3) — distinct from `leadsListBulkApi.execute`'s `archive`
   * action, which operates on a *filter match*, not an explicit id list. */
  async archiveMultiple(leadIds: string[], note?: string): Promise<{ success: true }> {
    return apiFetch<{ success: true }>(`/archived-leads-list/archive-multiple`, {
      method: "PATCH",
      body: { leadIds, note: note?.trim() ? note.trim() : undefined },
    });
  },
};

/**
 * Trash tab — `leads.controller.ts`'s `/leads/trash`+`/leads/:id/restore`+
 * `/leads/:id/permanent` (not a separate `trash` controller — traced
 * directly, no dedicated module exists). Workspace-scoped, not
 * board-scoped (a soft-deleted lead can come from any board), so unlike
 * every other tab this one doesn't take a `boardId` at all.
 */
export const trashApi = {
  async list(workspaceId: string): Promise<LeadRow[]> {
    return apiFetch<LeadRow[]>(`/leads/trash?workspace_id=${encodeURIComponent(workspaceId)}`);
  },
  async restore(leadId: string, workspaceId: string): Promise<LeadRow> {
    return apiFetch<LeadRow>(
      `/leads/${encodeURIComponent(leadId)}/restore?workspace_id=${encodeURIComponent(workspaceId)}`,
      { method: "POST" },
    );
  },
  async permanentlyDelete(leadId: string, workspaceId: string): Promise<{ success: true }> {
    return apiFetch<{ success: true }>(
      `/leads/${encodeURIComponent(leadId)}/permanent?workspace_id=${encodeURIComponent(workspaceId)}`,
      { method: "DELETE" },
    );
  },
};

/**
 * Workspace-level rejection-reason list — `lead-rejection-reasons.controller.ts`,
 * backed by `workspaces.settings.leadRejectionReasons` (not a dedicated
 * table). `GET` always returns a non-empty array — a workspace that hasn't
 * customized its list yet gets the backend's own Uzbek defaults
 * (`DEFAULT_REASONS` in `lead-rejection-reasons.service.ts`), never `[]` —
 * confirmed directly in the service. `PUT` replaces the whole list
 * (server-side sanitized: trimmed, deduped, capped at 30 items/200 chars
 * each) — there's no per-reason CRUD endpoint, so the reason-list manager
 * always sends the full next array.
 */
export const leadRejectionReasonsApi = {
  async list(workspaceId: string): Promise<string[]> {
    return apiFetch<string[]>(`/lead-rejection-reasons?workspace_id=${encodeURIComponent(workspaceId)}`);
  },
  async set(workspaceId: string, reasons: string[]): Promise<string[]> {
    return apiFetch<string[]>(`/lead-rejection-reasons`, {
      method: "PUT",
      body: { workspace_id: workspaceId, reasons },
    });
  },
};

/**
 * Filtered ("act on every lead matching the current filters") bulk actions —
 * `leads-list.controller.ts`'s `bulk/preview` + `bulk/execute`, a real,
 * dedicated, already-built endpoint pair (not something this pass had to
 * invent client-side id-resolution for): the server itself resolves every
 * matching lead id server-side (paginating internally up to a 50,000-row
 * cap) and applies the action in one call. Scoped to exactly the same base
 * query as the Active tab's List view (`archived=false, sold=false,
 * rejected=false, deleted_at is null`, confirmed directly in
 * `leads-list.service.ts`'s `baseLeadsSelect()`/`buildFilteredIdQuery()`) —
 * so this dialog only makes sense from the Active tab, not Sold/Rejected/
 * Archived/Trash, which have no equivalent filtered-bulk endpoint of their
 * own (traced directly, not assumed).
 */
export type FilteredBulkAction = "archive" | "delete" | "move" | "assign" | "moveBoard";

/** Per-source-stage mapping for the `moveBoard` action — mirrors the
 * backend's own `StageMoveMapping` (`right-board-controller.service.ts`).
 * Every distinct column the filtered leads currently sit in must be mapped
 * to either an existing column on the target board or a brand-new one. */
export interface StageMoveMapping {
  sourceColumnId: string;
  targetColumnId?: string;
  createNew?: boolean;
  name?: string;
  color?: string;
}

export interface FilteredBulkParams {
  boardId: string;
  filters?: LeadFilters;
  selectedColumns?: string[];
}

export interface FilteredBulkExecuteParams extends FilteredBulkParams {
  action: FilteredBulkAction;
  columnId?: string;
  operatorId?: string | null;
  targetBoardId?: string;
  stageMapping?: StageMoveMapping[];
}

/**
 * Lead Comments tab (Phase 2c-4) — `leads-comments.controller.ts`. Unlike
 * every other endpoint in this file, `list` is a `POST` with `{leadId}` in
 * the body (not a `GET` — traced directly, not assumed REST-ful). File
 * attachments upload separately (`POST /leads-comments/upload`, multipart,
 * 5 MB cap) and the returned `publicUrl` is included in `imageUrls` on
 * create/update — the comment row itself never accepts a raw file.
 */
export const leadCommentsApi = {
  async list(leadId: string): Promise<LeadComment[]> {
    return apiFetch<LeadComment[]>(`/leads-comments/list`, { method: "POST", body: { leadId } });
  },
  async create(leadId: string, content: string, imageUrls: string[] = []): Promise<LeadComment> {
    return apiFetch<LeadComment>(`/leads-comments/create`, {
      method: "POST",
      body: { leadId, content, imageUrls },
    });
  },
  async update(commentId: string, content: string, imageUrls?: string[]): Promise<LeadComment> {
    return apiFetch<LeadComment>(`/leads-comments/${encodeURIComponent(commentId)}`, {
      method: "PATCH",
      body: { content, imageUrls },
    });
  },
  async remove(commentId: string): Promise<{ success: true }> {
    return apiFetch<{ success: true }>(`/leads-comments/${encodeURIComponent(commentId)}`, { method: "DELETE" });
  },
  /** `{file}` multipart field name, matches `FileInterceptor('file', ...)`
   * server-side. Returns `{url, publicUrl}` (both the same value — the
   * controller returns the pair for old-frontend compat, see its own doc
   * comment); this client only needs `publicUrl`. */
  async upload(file: File): Promise<{ publicUrl: string }> {
    const form = new FormData();
    form.append("file", file);
    return apiFetch<{ url: string; publicUrl: string }>(`/leads-comments/upload`, { method: "POST", body: form });
  },
};

/**
 * Lead Stats tab (Phase 2c-4) — `lead-stats.controller.ts`, `GET
 * /lead-stats/:leadId?workspace_id=`. Every counter is live-aggregated
 * server-side (see that controller's own doc comment) — nothing here is
 * computed client-side or fabricated.
 */
export const leadStatsApi = {
  async get(leadId: string, workspaceId: string): Promise<LeadStats> {
    return apiFetch<LeadStats>(
      `/lead-stats/${encodeURIComponent(leadId)}?workspace_id=${encodeURIComponent(workspaceId)}`,
    );
  },
};

/**
 * Additional phone numbers (Info tab expansion, Phase 2c-4) —
 * `leads.controller.ts`'s dedicated `/leads/:id/phones` CRUD, distinct from
 * the generic db-proxy's own `lead_phones` registration (that one exists
 * for other backend-internal callers; the UI always goes through these
 * dedicated endpoints, which additionally normalize/validate the phone
 * number and refuse one that already belongs to another lead in the
 * workspace — confirmed directly in `leads.service.ts`, not reproducible
 * via the generic proxy).
 */
export const leadPhonesApi = {
  async list(leadId: string): Promise<LeadPhone[]> {
    return apiFetch<LeadPhone[]>(`/leads/${encodeURIComponent(leadId)}/phones`);
  },
  async add(leadId: string, payload: { phone_number: string; label?: string }): Promise<LeadPhone> {
    return apiFetch<LeadPhone>(`/leads/${encodeURIComponent(leadId)}/phones`, { method: "POST", body: payload });
  },
  async update(
    leadId: string,
    phoneId: string,
    payload: { phone_number?: string; label?: string },
  ): Promise<LeadPhone> {
    return apiFetch<LeadPhone>(`/leads/${encodeURIComponent(leadId)}/phones/${encodeURIComponent(phoneId)}`, {
      method: "PATCH",
      body: payload,
    });
  },
  async remove(leadId: string, phoneId: string): Promise<{ success: true }> {
    return apiFetch<{ success: true }>(`/leads/${encodeURIComponent(leadId)}/phones/${encodeURIComponent(phoneId)}`, {
      method: "DELETE",
    });
  },
};

export const leadsListBulkApi = {
  /** `POST /leads-list/bulk/preview` — `{count}`, how many leads currently
   * match `filters` (+ optional `selectedColumns` stage scoping, not wired
   * client-side this pass — every real column is included, matching the
   * rest of this feature's `selectedColumns`-omitted precedent). */
  async preview(params: FilteredBulkParams): Promise<{ count: number }> {
    return apiFetch<{ count: number }>(`/leads-list/bulk/preview`, {
      method: "POST",
      body: {
        boardId: params.boardId,
        filters: params.filters ? filtersToLeadListFilters(params.filters) : undefined,
        selectedColumns: params.selectedColumns,
      },
    });
  },
  /** `POST /leads-list/bulk/execute` — `{affected}`, runs `action` against
   * every lead matching `filters` (archive/delete/move/assign resolve
   * against the current board; `moveBoard` also validates `targetBoardId`
   * belongs to the caller's workspace server-side). */
  async execute(params: FilteredBulkExecuteParams): Promise<{ affected: number }> {
    return apiFetch<{ affected: number }>(`/leads-list/bulk/execute`, {
      method: "POST",
      body: {
        boardId: params.boardId,
        filters: params.filters ? filtersToLeadListFilters(params.filters) : undefined,
        selectedColumns: params.selectedColumns,
        action: params.action,
        columnId: params.columnId,
        operatorId: params.operatorId,
        targetBoardId: params.targetBoardId,
        stageMapping: params.stageMapping,
      },
    });
  },
};
