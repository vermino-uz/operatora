import { apiFetch } from "@/services/api/client";
import type {
  AdsAudience,
  AdsCampaign,
  AdsCreative,
  AdsOAuthCallbackResult,
  AdsSchedule,
  AdsStatus,
  AdsBillingMode,
} from "@/features/ads/types";

/** `ads.controller.ts` — see `features/ads/types.ts`'s doc comment for the
 * full RBAC/ownership trace. No `workspace_id` param on any route — the
 * backend derives it purely from the JWT. */
export const adsApi = {
  async status(): Promise<AdsStatus> {
    return apiFetch<AdsStatus>("/ads/status");
  },

  async campaigns(): Promise<{ campaigns: AdsCampaign[]; sample: boolean }> {
    return apiFetch<{ campaigns: AdsCampaign[]; sample: boolean }>("/ads/campaigns");
  },

  /** Starts the Meta OAuth flow — full-page redirect (`authorizeUrl`), not
   * a popup (matches the old frontend's own `window.location.href =` flow,
   * unlike Instagram's popup+`postMessage` flow). Returns `disabled: true`
   * with a message when `META_ADS_ENABLED` is off server-side. */
  async connect(billingMode: AdsBillingMode): Promise<{ authorizeUrl: string | null; disabled?: boolean; message?: string }> {
    return apiFetch("/ads/connect", { method: "POST", body: { billingMode } });
  },

  async oauthCallback(params: { code: string; state: string }): Promise<AdsOAuthCallbackResult> {
    return apiFetch<AdsOAuthCallbackResult>("/ads/oauth-callback", { method: "POST", body: params });
  },

  async oauthConnect(params: { selectionToken: string; adAccountId: string }): Promise<{ success: true }> {
    return apiFetch<{ success: true }>("/ads/oauth-connect", {
      method: "POST",
      body: { selection_token: params.selectionToken, ad_account_id: params.adAccountId },
    });
  },

  /** `confirm: true` is server-mandatory (400 `code: 'confirmation_required'`
   * otherwise) — this app always sends it after its own inline confirm UI,
   * same as every other money-affecting action in this codebase. */
  async updateBudget(params: { campaignId: string; dailyBudget: number }): Promise<{
    campaign: AdsCampaign;
    sample: boolean;
    commissionPercent: number;
  }> {
    return apiFetch("/ads/budget", { method: "POST", body: { ...params, confirm: true } });
  },

  async updateAudience(params: { campaignId: string; audience: AdsAudience }): Promise<{ campaign: AdsCampaign; sample: boolean }> {
    return apiFetch("/ads/audience", { method: "POST", body: params });
  },

  async updateSchedule(params: { campaignId: string; schedule: AdsSchedule }): Promise<{ campaign: AdsCampaign; sample: boolean }> {
    return apiFetch("/ads/schedule", { method: "POST", body: params });
  },

  /** Activating (`status: 'active'`) requires `confirm: true`; pausing does not. */
  async setStatus(params: { campaignId: string; status: "active" | "paused" }): Promise<{ campaign: AdsCampaign; sample: boolean }> {
    return apiFetch("/ads/status-set", {
      method: "POST",
      body: { ...params, confirm: params.status === "active" ? true : undefined },
    });
  },

  async setCreativeStatus(params: { adId: string; status: "active" | "paused" }): Promise<{ creative: AdsCreative; sample: boolean }> {
    return apiFetch("/ads/creative-status-set", {
      method: "POST",
      body: { ...params, confirm: params.status === "active" ? true : undefined },
    });
  },
};
