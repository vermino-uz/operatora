import { apiFetch } from "@/services/api/client";
import type {
  CreateImportSourceInput,
  GoogleSheetsImportSource,
  GoogleSheetsIntegration,
  GoogleSheetsStatus,
  GoogleSpreadsheetOption,
  SheetPreviewInfo,
  UpdateExportConfigInput,
  UpdateImportConfigInput,
} from "@/features/google-sheets/types";

/** Shape every mutating `/google-sheets/*` config endpoint returns —
 * `{success, integration}`, not the `{connected, integration}` shape
 * `status` returns (confirmed in `google-sheets.service.ts`: `updateConfig`,
 * `updateImportConfig`, `updateExportConfig`, `createExportSheet` all
 * `return { success: true, integration: this.toPublicIntegration(...) }`). */
export interface GoogleSheetsConfigResult {
  success: boolean;
  integration: GoogleSheetsIntegration;
}

/** `/google-sheets/*` — every route requires an explicit `workspace_id`
 * (query param on GETs, body field on writes); this module always sends it
 * explicitly, matching the confirmed contract (no JWT-only derivation like
 * `/departments`). */
export const googleSheetsApi = {
  async status(workspaceId: string): Promise<GoogleSheetsStatus> {
    return apiFetch<GoogleSheetsStatus>(`/google-sheets/status?workspace_id=${encodeURIComponent(workspaceId)}`);
  },

  async getOAuthUrl(workspaceId: string, redirectUri: string): Promise<{ authUrl: string }> {
    const params = new URLSearchParams({ workspace_id: workspaceId, redirect_uri: redirectUri });
    return apiFetch<{ authUrl: string }>(`/google-sheets/oauth-url?${params}`);
  },

  async completeOAuth(input: {
    code: string;
    state?: string;
    redirect_uri?: string;
    user_id?: string;
  }): Promise<{ success: boolean; integration: GoogleSheetsIntegration }> {
    return apiFetch<{ success: boolean; integration: GoogleSheetsIntegration }>("/google-sheets/oauth-callback", {
      method: "POST",
      body: input,
    });
  },

  async disconnect(workspaceId: string): Promise<void> {
    await apiFetch<unknown>(`/google-sheets/disconnect?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: "DELETE",
    });
  },

  async listSpreadsheets(workspaceId: string): Promise<GoogleSpreadsheetOption[]> {
    const res = await apiFetch<{ spreadsheets: GoogleSpreadsheetOption[] }>(
      `/google-sheets/spreadsheets?workspace_id=${encodeURIComponent(workspaceId)}`,
    );
    return res.spreadsheets ?? [];
  },

  async listTabs(workspaceId: string, spreadsheetId: string): Promise<string[]> {
    const params = new URLSearchParams({ workspace_id: workspaceId, spreadsheet_id: spreadsheetId });
    const res = await apiFetch<{ tabs: string[] }>(`/google-sheets/tabs?${params}`);
    return res.tabs ?? [];
  },

  async previewRows(workspaceId: string, spreadsheetId: string, sheetTabName?: string): Promise<SheetPreviewInfo> {
    const params = new URLSearchParams({ workspace_id: workspaceId, spreadsheet_id: spreadsheetId });
    if (sheetTabName) params.set("sheet_tab_name", sheetTabName);
    return apiFetch<SheetPreviewInfo>(`/google-sheets/preview-rows?${params}`);
  },

  async updateConfig(input: {
    workspace_id: string;
    spreadsheet_id_or_url: string;
    sheet_tab_name: string;
  }): Promise<GoogleSheetsConfigResult> {
    return apiFetch<GoogleSheetsConfigResult>("/google-sheets/config", { method: "PATCH", body: input });
  },

  async updateImportConfig(workspaceId: string, input: UpdateImportConfigInput): Promise<GoogleSheetsConfigResult> {
    return apiFetch<GoogleSheetsConfigResult>("/google-sheets/import/config", {
      method: "PATCH",
      body: { workspace_id: workspaceId, ...input },
    });
  },

  async importToBoard(input: {
    workspace_id: string;
    board_id: string;
    column_id?: string;
    spreadsheet_id_or_url?: string;
    sheet_tab_name?: string;
  }): Promise<{ imported: number; skipped: number }> {
    return apiFetch<{ imported: number; skipped: number }>("/google-sheets/import-to-board", {
      method: "POST",
      body: input,
    });
  },

  async listImportSources(workspaceId: string): Promise<GoogleSheetsImportSource[]> {
    const res = await apiFetch<{ sources: GoogleSheetsImportSource[] }>(
      `/google-sheets/import-sources?workspace_id=${encodeURIComponent(workspaceId)}`,
    );
    return res.sources ?? [];
  },

  async createImportSource(
    workspaceId: string,
    input: CreateImportSourceInput,
  ): Promise<GoogleSheetsImportSource> {
    const res = await apiFetch<{ success: boolean; source: GoogleSheetsImportSource }>(
      "/google-sheets/import-sources",
      { method: "POST", body: { workspace_id: workspaceId, ...input } },
    );
    return res.source;
  },

  async updateImportSource(
    workspaceId: string,
    id: string,
    patch: Partial<CreateImportSourceInput>,
  ): Promise<GoogleSheetsImportSource> {
    const res = await apiFetch<{ success: boolean; source: GoogleSheetsImportSource }>(
      `/google-sheets/import-sources/${encodeURIComponent(id)}`,
      { method: "PATCH", body: { workspace_id: workspaceId, ...patch } },
    );
    return res.source;
  },

  async deleteImportSource(workspaceId: string, id: string): Promise<void> {
    await apiFetch<unknown>(
      `/google-sheets/import-sources/${encodeURIComponent(id)}?workspace_id=${encodeURIComponent(workspaceId)}`,
      { method: "DELETE" },
    );
  },

  async updateExportConfig(workspaceId: string, input: UpdateExportConfigInput): Promise<GoogleSheetsConfigResult> {
    return apiFetch<GoogleSheetsConfigResult>("/google-sheets/export/config", {
      method: "PATCH",
      body: { workspace_id: workspaceId, ...input },
    });
  },

  async createExportSheet(workspaceId: string): Promise<GoogleSheetsConfigResult> {
    return apiFetch<GoogleSheetsConfigResult>("/google-sheets/export/create-sheet", {
      method: "POST",
      body: { workspace_id: workspaceId },
    });
  },

  async exportBoard(workspaceId: string, boardId: string): Promise<{ exported: number }> {
    return apiFetch<{ exported: number }>("/google-sheets/export/board", {
      method: "POST",
      body: { workspace_id: workspaceId, board_id: boardId },
    });
  },
};
