import { apiFetch } from "@/services/api/client";
import type {
  EskizAccount,
  EskizConnectInput,
  EskizGuidance,
  EskizHistoryPage,
  EskizReportPeriod,
  EskizReportsSummary,
  EskizTemplate,
  EskizTopUpProvider,
  EskizTopUpResult,
} from "@/features/eskiz/types";

/** `/eskiz/*` — see `features/eskiz/types.ts` for the full contract trace. */
export const eskizApi = {
  async getAccount(): Promise<EskizAccount | null> {
    return apiFetch<EskizAccount | null>("/eskiz/account");
  },

  async getGuidance(): Promise<EskizGuidance> {
    return apiFetch<EskizGuidance>("/eskiz/guidance");
  },

  async connect(input: EskizConnectInput): Promise<EskizAccount> {
    return apiFetch("/eskiz/connect", { method: "POST", body: input });
  },

  async disconnect(): Promise<{ success: true }> {
    return apiFetch("/eskiz/account", { method: "DELETE" });
  },

  async syncBalance(): Promise<{ balance_uzs: number }> {
    return apiFetch("/eskiz/balance/sync", { method: "POST" });
  },

  async listTemplates(): Promise<EskizTemplate[]> {
    const data = await apiFetch<EskizTemplate[]>("/eskiz/templates");
    return Array.isArray(data) ? data : [];
  },

  async submitTemplate(content: string): Promise<EskizTemplate> {
    return apiFetch("/eskiz/templates", { method: "POST", body: { content } });
  },

  async syncTemplates(): Promise<EskizTemplate[]> {
    const data = await apiFetch<EskizTemplate[]>("/eskiz/templates/sync", { method: "POST" });
    return Array.isArray(data) ? data : [];
  },

  async resubmitTemplate(id: string): Promise<EskizTemplate> {
    return apiFetch(`/eskiz/templates/${encodeURIComponent(id)}/resubmit`, { method: "POST" });
  },

  async getHistory(opts: {
    status?: string;
    period?: EskizReportPeriod;
    page?: number;
    limit?: number;
  }): Promise<EskizHistoryPage> {
    const params = new URLSearchParams();
    if (opts.status) params.set("status", opts.status);
    params.set("period", opts.period ?? "all");
    params.set("page", String(opts.page ?? 1));
    params.set("limit", String(opts.limit ?? 50));
    return apiFetch(`/eskiz/history?${params}`);
  },

  async getReports(period: EskizReportPeriod = "today"): Promise<EskizReportsSummary> {
    return apiFetch(`/eskiz/reports/summary?period=${period}`);
  },

  /** `POST /billing/eskiz/top-up` — tops up the workspace's connected Eskiz
   * account balance via a payment provider. Returns a checkout URL (Click/
   * Paylov) to open, or a plain confirmation message. Real endpoint, traced
   * from `billing.controller.ts`'s `eskizTopUp()` — not gated behind an
   * `account_mode` flag server-side (the old frontend's "platform balance"
   * account-mode toggle was UI-only informational copy, the endpoint itself
   * only requires `amount_uzs` + a connected workspace). */
  async topUp(amountUzs: number, provider: EskizTopUpProvider): Promise<EskizTopUpResult> {
    return apiFetch("/billing/eskiz/top-up", {
      method: "POST",
      body: { amount_uzs: amountUzs, provider },
    });
  },
};
