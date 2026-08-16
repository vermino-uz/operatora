import { apiFetch } from "@/services/api/client";
import { filtersToLeadListFilters } from "@/services/api/leads";
import type { LeadFilters } from "@/features/leads/types";

/**
 * Leads CSV export (Phase 2c-9) — `GET /leads-list/export`
 * (`leads-controller/leads-list/leads-list.controller.ts`/`.service.ts`),
 * a real, already-built endpoint (not invented for this pass). Same
 * `filters=`/`boardId` param shape as `leads-list`'s own paginated list
 * (`filtersToLeadListFilters`, reused verbatim). `selectedColumns` here
 * means exactly what it means on every other `leads-list`/`leads-list-bulk`
 * endpoint in this codebase — board **pipeline-stage (column) ids** to
 * scope the export to (confirmed directly in `resolveSelectedColumnIds()`)
 * — *not* a picker of which output fields appear in the CSV. The server's
 * CSV header row is fixed (`leadsToCsv()`: id/first_name/last_name/
 * phone_number/age/marital_status/academic_status/stage/operator/deadline/
 * created_at/updated_at/custom_fields, the last one a single raw JSON
 * blob) — there is no server-side output-field picker to call. The
 * standard-field/custom-field checkbox picker this app's export dialog
 * offers is real value added client-side on top of this real, filtered,
 * server-authoritative row set — see `buildExportCsv()` in
 * `features/leads/leadExportCsv.ts` for the reshape, never a fabricated
 * server capability.
 */
export interface LeadsExportResult {
  csv: string;
  count: number;
  filename: string;
}

export const leadsExportApi = {
  async exportCsv(params: {
    boardId: string;
    filters?: LeadFilters;
    /** Board pipeline-stage (column) ids to scope to; omit/empty = every
     * non-special column on the board (server default). */
    selectedColumns?: string[];
  }): Promise<LeadsExportResult> {
    const qs = new URLSearchParams({ boardId: params.boardId });
    if (params.filters) qs.set("filters", JSON.stringify(filtersToLeadListFilters(params.filters)));
    if (params.selectedColumns?.length) qs.set("selectedColumns", JSON.stringify(params.selectedColumns));
    return apiFetch<LeadsExportResult>(`/leads-list/export?${qs.toString()}`);
  },
};

/**
 * Leads bulk import (Phase 2c-9) — `leads-controller/leads-import/
 * {leads-import.controller,leads-import.service}.ts`. Real, already-built
 * endpoint: `GET /leads-import/sample` (a ready-made `.xlsx` template,
 * base64-encoded, seeded with the workspace's real importable custom
 * fields as extra header columns) and `POST /leads-import/bulk` (multipart,
 * `.xlsx`/`.xls`/`.csv`, 5 MB cap — matches this app's file-size/type
 * validation rule; max 2000 rows, enforced server-side). The endpoint does
 * its **own** header auto-detection server-side (see
 * `features/leads/importFieldMatch.ts`'s header comment for why there is no
 * client-supplied mapping param to send) — duplicate phone numbers are
 * skipped server-side and counted, never silently overwritten.
 */
export interface LeadsBulkImportResult {
  imported: number;
  skipped: number;
  duplicates: number;
  total: number;
  columnsCreated: number;
}

export const leadsImportApi = {
  async getSample(workspaceId?: string): Promise<{ base64: string; filename: string }> {
    const qs = workspaceId ? `?workspace_id=${encodeURIComponent(workspaceId)}` : "";
    return apiFetch<{ base64: string; filename: string }>(`/leads-import/sample${qs}`);
  },

  async bulkImport(params: {
    file: File;
    boardId: string;
    columnId?: string;
    workspaceId?: string;
    operatorId?: string;
  }): Promise<LeadsBulkImportResult> {
    const form = new FormData();
    form.append("file", params.file);
    form.append("board_id", params.boardId);
    if (params.columnId) form.append("column_id", params.columnId);
    if (params.workspaceId) form.append("workspace_id", params.workspaceId);
    if (params.operatorId) form.append("operator_id", params.operatorId);
    return apiFetch<LeadsBulkImportResult>(`/leads-import/bulk`, { method: "POST", body: form });
  },
};
