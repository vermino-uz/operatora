/**
 * `google-sheets` settings section — traced from the old frontend's
 * `GoogleSheetsIntegration.tsx` / `useGoogleSheets.ts` /
 * `useGoogleSheetsExport.ts` / `useGoogleSheetsImportSources.ts` against the
 * real `settings-controller/google-sheets-controller/google-sheets.controller.ts`
 * (`/google-sheets/*`). One shared workspace-level Google OAuth connection
 * (unlike Google Calendar's per-operator connection) drives two independent
 * features off the same account: **import** (pull leads from a spreadsheet
 * into a board, one primary sheet plus any number of additional named
 * "import sources", with realtime Drive-webhook auto-sync) and **export**
 * (create/link a spreadsheet, one-time full-board sync, or auto-append new
 * leads). Permission: `assertCanManageGoogleSheets` — any workspace member
 * or global admin, not owner-only (confirmed in `google-sheets.service.ts`),
 * so no owner-only client gate is applied here.
 */

export interface GoogleSheetsIntegration {
  id: string;
  workspace_id: string;
  google_email: string | null;
  spreadsheet_id: string | null;
  sheet_tab_name: string;
  spreadsheet_url: string | null;
  export_spreadsheet_id?: string | null;
  export_sheet_tab_name?: string;
  export_spreadsheet_url?: string | null;
  auto_export_new_leads?: boolean;
  auto_import_new_leads?: boolean;
  import_board_id?: string | null;
  import_column_id?: string | null;
  drive_watch_expires_at?: string | null;
  last_import_at?: string | null;
  last_import_stats?: { imported?: number; skipped?: number; total?: number } | null;
  realtime_sync_active?: boolean;
  field_mapping?: Record<string, string> | null;
  ignored_columns?: string[] | null;
}

export interface GoogleSheetsStatus {
  connected: boolean;
  integration: GoogleSheetsIntegration | null;
}

export interface GoogleSpreadsheetOption {
  id: string;
  name: string;
  modifiedTime: string | null;
  url: string;
}

export interface SheetPreviewInfo {
  hasExistingRows: boolean;
  rowCount: number;
  hasBaseline: boolean;
  headers: string[];
}

/** Lead fields a workspace can map to a spreadsheet column — matches the
 * old frontend's `IMPORT_MAPPABLE_FIELDS` verbatim (plus custom fields,
 * out of scope here — see the panel's deferred-items note). */
export const IMPORT_MAPPABLE_FIELDS = [
  "first_name",
  "last_name",
  "phone_number",
  "email",
  "academic_status",
  "age",
  "marital_status",
  "notes",
] as const;

export type ImportMappableField = (typeof IMPORT_MAPPABLE_FIELDS)[number];

export const IMPORT_FIELD_LABELS: Record<ImportMappableField, string> = {
  first_name: "First name",
  last_name: "Last name",
  phone_number: "Phone number",
  email: "Email",
  academic_status: "Academic status",
  age: "Age",
  marital_status: "Marital status",
  notes: "Notes",
};

export type InitialImportMode = "import_all" | "skip_existing";

export interface UpdateImportConfigInput {
  auto_import_new_leads?: boolean;
  initial_import_mode?: InitialImportMode;
  import_board_id?: string | null;
  import_column_id?: string | null;
  field_mapping?: Record<string, string> | null;
  ignored_columns?: string[] | null;
}

export interface UpdateExportConfigInput {
  export_spreadsheet_id_or_url?: string;
  export_sheet_tab_name?: string;
  auto_export_new_leads?: boolean;
}

export interface GoogleSheetsImportSource {
  id: string;
  is_primary: boolean;
  name: string;
  spreadsheet_id: string | null;
  spreadsheet_url: string | null;
  sheet_tab_name: string;
  import_board_id: string | null;
  import_column_id: string | null;
  field_mapping: Record<string, string> | null;
  auto_import_new_leads: boolean;
  last_import_at: string | null;
  last_import_stats: { imported?: number; skipped?: number; total?: number } | null;
  realtime_sync_active: boolean;
}

export interface CreateImportSourceInput {
  name: string;
  spreadsheet_id_or_url: string;
  sheet_tab_name?: string;
  import_board_id?: string | null;
  import_column_id?: string | null;
  auto_import_new_leads?: boolean;
  initial_import_mode?: InitialImportMode;
}
