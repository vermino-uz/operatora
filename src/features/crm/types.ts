/**
 * `crm-integrations` settings section — traced from the old frontend's
 * `Settings.tsx` (`case "crm-integrations"`), which renders TWO independent
 * panels stacked together: `BitrixIntegrationSettings` (generic
 * `integration_connections` CRUD — Bitrix24 + Tilda webhooks, plus a
 * documented public lead-intake API) and `AmocrmIntegrationSettings` (a
 * fully separate, dedicated amoCRM module with its own OAuth-free
 * long-lived-token connect flow, board/status preview, and a background
 * import job with operator mapping). Two unrelated backend contracts, one
 * settings section — reproduced here as two panels, not merged, matching
 * old exactly.
 *
 * Backend: `amocrm/amocrm.controller.ts` (`/amocrm/*`, every mutating route
 * `assertWorkspaceOwner`-gated) and `integrations/integrations.controller.ts`
 * (`/integrations/*`, workspace-scoped via JWT only — the backend does not
 * gate this one to owners, confirmed by reading the controller directly, so
 * no client-side owner gate is applied here either).
 */

// --- amoCRM -----------------------------------------------------------------

export type AmocrmImportStatus = "connected" | "importing" | "completed" | "failed";

export interface AmocrmImportStats {
  leads_created?: number;
  leads_updated?: number;
  leads_failed?: number;
  leads_skipped?: number;
  leads_total?: number;
  operators_created?: number;
  operators_mapped?: number;
  operators_skipped?: number;
  operators_failed?: number;
  operators_seat_limit_hit?: boolean;
  operators_not_imported?: number;
  error?: string;
}

export interface AmocrmStatus {
  connected: boolean;
  subdomain?: string | null;
  status?: AmocrmImportStatus | null;
  last_import_at?: string | null;
  last_import_stats?: AmocrmImportStats | null;
  hasPendingOperatorCredentials?: boolean;
}

export interface AmocrmStatusPreview {
  id: number;
  name: string;
  color: string | null;
  count: number;
}

export interface AmocrmBoardPreview {
  id: number;
  name: string;
  count: number;
  statuses: AmocrmStatusPreview[];
}

export interface AmocrmPreviewUser {
  id: number;
  name: string;
  email: string;
  suggestedOperatorId: string | null;
  wouldCreateNewSeat: boolean;
}

export interface AmocrmExistingOperator {
  id: string;
  name: string;
  email: string | null;
}

export interface AmocrmSeatAvailability {
  current: number;
  limit: number | null;
  extraSeats: number;
  available: number | null;
  seatsNeeded: number;
}

export interface AmocrmOperatorsPreview {
  amocrmUsers: AmocrmPreviewUser[];
  existingOperators: AmocrmExistingOperator[];
  seatAvailability: AmocrmSeatAvailability;
}

export type AmocrmMappingChoice =
  | { action: "map"; operatorId: string }
  | { action: "skip" }
  | { action: "create" };

export interface AmocrmPendingCredential {
  email: string;
  temp_password: string;
}

// --- Generic integrations (Bitrix24 / Tilda) --------------------------------

export type IntegrationProvider = "bitrix24" | "tilda" | "webhook";

export interface IntegrationFieldMapping {
  external_field: string;
  lead_field: string;
}

export interface IntegrationConnection {
  id: string;
  provider: IntegrationProvider | string;
  name: string;
  webhook_secret: string;
  webhook_url: string;
  config: Record<string, unknown>;
  is_active: boolean;
  setup_status?: string;
  field_mappings?: IntegrationFieldMapping[];
  created_at?: string;
  updated_at?: string;
}

/** Old frontend's default Bitrix24 field mapping — reproduced verbatim. */
export const DEFAULT_BITRIX_FIELD_MAPPINGS: IntegrationFieldMapping[] = [
  { external_field: "NAME", lead_field: "first_name" },
  { external_field: "LAST_NAME", lead_field: "last_name" },
  { external_field: "PHONE", lead_field: "phone_number" },
  { external_field: "EMAIL", lead_field: "email" },
];
