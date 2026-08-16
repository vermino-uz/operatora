import { apiFetch } from "@/services/api/client";
import type {
  AmocrmBoardPreview,
  AmocrmOperatorsPreview,
  AmocrmPendingCredential,
  AmocrmStatus,
  IntegrationConnection,
  IntegrationFieldMapping,
  IntegrationProvider,
} from "@/features/crm/types";

/** `/amocrm/*` — every mutating route is `assertWorkspaceOwner`-gated
 * server-side; the workspace is derived from the JWT, no `workspace_id`
 * param anywhere (confirmed in `amocrm.controller.ts`). */
export const amocrmApi = {
  async status(): Promise<AmocrmStatus> {
    return apiFetch<AmocrmStatus>("/amocrm/status");
  },

  async connect(subdomain: string, accessToken: string): Promise<{ ok: boolean }> {
    return apiFetch<{ ok: boolean }>("/amocrm/connect", {
      method: "POST",
      body: { subdomain, access_token: accessToken },
    });
  },

  async disconnect(): Promise<void> {
    await apiFetch<unknown>("/amocrm/disconnect", { method: "DELETE" });
  },

  async previewBoards(): Promise<{ boards: AmocrmBoardPreview[] }> {
    return apiFetch<{ boards: AmocrmBoardPreview[] }>("/amocrm/preview-boards");
  },

  async previewOperators(): Promise<AmocrmOperatorsPreview> {
    return apiFetch<AmocrmOperatorsPreview>("/amocrm/preview-operators");
  },

  async startImport(
    operatorMapping?: Record<string, { action: "map" | "skip"; operatorId?: string }>,
    selectedStatusIds?: number[],
  ): Promise<{ ok: boolean }> {
    return apiFetch<{ ok: boolean }>("/amocrm/import", {
      method: "POST",
      body: { operator_mapping: operatorMapping, selected_status_ids: selectedStatusIds },
    });
  },

  async pendingOperatorCredentials(): Promise<{ credentials: AmocrmPendingCredential[] }> {
    return apiFetch<{ credentials: AmocrmPendingCredential[] }>("/amocrm/pending-operator-credentials");
  },
};

/** `/integrations/*` — Bitrix24/Tilda generic webhook connections.
 * Workspace-scoped via JWT; the backend does not gate this to workspace
 * owners (confirmed in `integrations.controller.ts`), so no client-side
 * owner check is applied here either. */
export const integrationsApi = {
  async list(): Promise<IntegrationConnection[]> {
    const res = await apiFetch<{ connections: IntegrationConnection[] }>("/integrations");
    return res.connections ?? [];
  },

  async create(input: {
    provider: IntegrationProvider;
    name: string;
    config?: Record<string, unknown>;
    field_mappings?: IntegrationFieldMapping[];
  }): Promise<IntegrationConnection> {
    return apiFetch<IntegrationConnection>("/integrations", { method: "POST", body: input });
  },

  async remove(id: string): Promise<void> {
    await apiFetch<{ ok: boolean }>(`/integrations/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
};
