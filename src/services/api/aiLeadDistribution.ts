import { apiFetch } from "@/services/api/client";

/**
 * AI Lead Distribution — `AiLeadDistributionController` at
 * `/leads-ai-distribution` (`ai-lead-distribution.controller.ts`), backed
 * by real greedy-assignment logic in `ai-lead-distribution.service.ts`
 * (`parseCommand()` -> OpenAI-parsed natural-language instruction into a
 * structured `DistributionPlan`, `preview()`/`apply()` -> deterministic
 * greedy assignment of unassigned leads across the chosen operators, `even`
 * or `backlog_aware` mode). Every endpoint requires the caller to be a
 * workspace owner/admin server-side (`isWorkspaceOwnerOrAdmin`) — a 403 is
 * a real, expected outcome for non-admin callers, not a bug.
 */
export type DistributionMode = "even" | "backlog_aware";

export interface DistributionPlan {
  operatorIds: string[];
  mode: DistributionMode;
  channelFilter: "telegram" | "instagram" | "sms" | "whatsapp" | null;
  reply: string;
}

export interface DistributionOperator {
  id: string;
  name: string;
}

export interface DistributionPreview {
  leadCount: number;
  perOperator: { operatorId: string; name: string; count: number }[];
}

export interface BoardAiDistributionSettings {
  board_id: string;
  workspace_id: string;
  enabled: boolean;
  operator_ids: string[];
  mode: DistributionMode;
  channel_filter: string | null;
  last_run_at: string | null;
}

export const aiLeadDistributionApi = {
  /** `GET /leads-ai-distribution/operators` — active operators for the
   * chat picker's implied targeting. */
  async listOperators(): Promise<DistributionOperator[]> {
    return apiFetch<DistributionOperator[]>("/leads-ai-distribution/operators");
  },

  /** `POST /leads-ai-distribution/:boardId/plan` — parses a natural-language
   * instruction into a `DistributionPlan` + a dry-run `DistributionPreview`,
   * writes nothing. */
  async plan(boardId: string, message: string): Promise<{ plan: DistributionPlan; preview: DistributionPreview }> {
    return apiFetch<{ plan: DistributionPlan; preview: DistributionPreview }>(
      `/leads-ai-distribution/${encodeURIComponent(boardId)}/plan`,
      { method: "POST", body: { message } },
    );
  },

  /** `POST /leads-ai-distribution/:boardId/apply` — actually assigns the
   * matching unassigned leads per a previously-previewed plan. */
  async apply(boardId: string, plan: DistributionPlan): Promise<{ assigned: number }> {
    return apiFetch<{ assigned: number }>(`/leads-ai-distribution/${encodeURIComponent(boardId)}/apply`, {
      method: "POST",
      body: { plan },
    });
  },

  /** `GET /leads-ai-distribution/:boardId/settings` — this board's recurring
   * auto-distribution setting (a background sweep re-runs the saved plan
   * against newly-unassigned leads), or `null` if never configured. */
  async getSettings(boardId: string): Promise<BoardAiDistributionSettings | null> {
    return apiFetch<BoardAiDistributionSettings | null>(`/leads-ai-distribution/${encodeURIComponent(boardId)}/settings`);
  },

  /** `PATCH /leads-ai-distribution/:boardId/settings` — enable/disable the
   * recurring sweep, reusing a confirmed plan's operator set/mode/channel
   * filter. */
  async updateSettings(
    boardId: string,
    body: { enabled: boolean; operator_ids?: string[]; mode?: DistributionMode; channel_filter?: string | null },
  ): Promise<BoardAiDistributionSettings> {
    return apiFetch<BoardAiDistributionSettings>(`/leads-ai-distribution/${encodeURIComponent(boardId)}/settings`, {
      method: "PATCH",
      body,
    });
  },
};
