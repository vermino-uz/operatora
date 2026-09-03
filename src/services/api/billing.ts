import { apiFetch } from "@/services/api/client";
import type { BillingFeatures, RentOperatorSeatResponse } from "@/features/team/types";
import type {
  BillingInvoice,
  ChargeSubscriptionResponse,
  ConfirmCardResponse,
  DeclineSeatResponse,
  SavedPaymentCard,
  StartAddCardResponse,
  TopUpGatewayResponse,
} from "@/features/billing/types";

/**
 * Billing/seats — traced from the old frontend's `useBillingFeatures.ts` +
 * `OperatorUsersManager.tsx`'s rent-seat mutation, against
 * `billing.controller.ts` (`GET /billing/me`, `POST /billing/operator-seat/rent`).
 * Extended for the Billing & Usage settings section (invoices, payment
 * cards, prepaid balance top-up, decline-seat, subscription charge) —
 * traced from `BillingUsagePanel.tsx`/`PaymentCardsPanel.tsx`/
 * `WorkspaceBalancePanel.tsx` against the rest of `billing.controller.ts`.
 * `GET /billing/me` already returns everything Team Members/Storage need
 * *and* everything the Billing section's plan/usage/balance summary needs
 * — no separate `/billing/usage` call, `me()` below is the single source.
 */
export const billingApi = {
  async me(workspaceId: string): Promise<BillingFeatures> {
    const data = await apiFetch<Record<string, unknown>>(`/billing/me?workspace_id=${encodeURIComponent(workspaceId)}`);
    const limits = (data.limits ?? {}) as Partial<BillingFeatures["limits"]>;
    const usage = (data.usage ?? {}) as Partial<BillingFeatures["usage"]>;
    return {
      planSlug: (data.planSlug as BillingFeatures["planSlug"]) ?? (data.tier as BillingFeatures["planSlug"]) ?? "free",
      planName: (data.planName as string) ?? (data.planSlug as string) ?? "Free",
      tier: (data.tier as string) ?? "free",
      status: (data.status as string) ?? "trialing",
      access: (data.access as BillingFeatures["access"]) ?? "full",
      limits: {
        calls_per_month: limits.calls_per_month ?? null,
        ai_chat_messages: limits.ai_chat_messages ?? null,
        ai_dashboards: limits.ai_dashboards ?? null,
        custom_dashboards: limits.custom_dashboards ?? null,
        image_generations: limits.image_generations ?? null,
        max_operators: limits.max_operators ?? null,
        storage_mb: limits.storage_mb ?? null,
        storage_retention_days: limits.storage_retention_days ?? null,
        credits_ai_chat: limits.credits_ai_chat ?? null,
        credits_ai_transcript: limits.credits_ai_transcript ?? null,
        credits_ai_conversation: limits.credits_ai_conversation ?? null,
        credits_ai_agent_reply: limits.credits_ai_agent_reply ?? null,
        credits_ai_agent_suggest: limits.credits_ai_agent_suggest ?? null,
        credits_ai_inbox_recap: limits.credits_ai_inbox_recap ?? null,
        credits_ai_agent_copilot: limits.credits_ai_agent_copilot ?? null,
        credits_ai_ranker: limits.credits_ai_ranker ?? null,
        credits_ai_lead_distribution: limits.credits_ai_lead_distribution ?? null,
        credits_ai_lead_assist: limits.credits_ai_lead_assist ?? null,
        credits_ai_custom_dashboard: limits.credits_ai_custom_dashboard ?? null,
        credits_ai_ads_copilot: limits.credits_ai_ads_copilot ?? null,
      },
      usage: {
        storage_mb: Number(usage.storage_mb) || 0,
        calls_per_month: usage.calls_per_month == null ? undefined : Number(usage.calls_per_month) || 0,
        ai_chat_messages: usage.ai_chat_messages == null ? undefined : Number(usage.ai_chat_messages) || 0,
        ai_dashboards: usage.ai_dashboards == null ? undefined : Number(usage.ai_dashboards) || 0,
        custom_dashboards: usage.custom_dashboards == null ? undefined : Number(usage.custom_dashboards) || 0,
        image_generations: usage.image_generations == null ? undefined : Number(usage.image_generations) || 0,
        credits_ai_chat: usage.credits_ai_chat == null ? undefined : Number(usage.credits_ai_chat) || 0,
        credits_ai_transcript:
          usage.credits_ai_transcript == null ? undefined : Number(usage.credits_ai_transcript) || 0,
        credits_ai_conversation:
          usage.credits_ai_conversation == null ? undefined : Number(usage.credits_ai_conversation) || 0,
        credits_ai_agent_reply:
          usage.credits_ai_agent_reply == null ? undefined : Number(usage.credits_ai_agent_reply) || 0,
        credits_ai_agent_suggest:
          usage.credits_ai_agent_suggest == null ? undefined : Number(usage.credits_ai_agent_suggest) || 0,
        credits_ai_inbox_recap:
          usage.credits_ai_inbox_recap == null ? undefined : Number(usage.credits_ai_inbox_recap) || 0,
        credits_ai_agent_copilot:
          usage.credits_ai_agent_copilot == null ? undefined : Number(usage.credits_ai_agent_copilot) || 0,
        credits_ai_ranker: usage.credits_ai_ranker == null ? undefined : Number(usage.credits_ai_ranker) || 0,
        credits_ai_lead_distribution:
          usage.credits_ai_lead_distribution == null
            ? undefined
            : Number(usage.credits_ai_lead_distribution) || 0,
        credits_ai_lead_assist:
          usage.credits_ai_lead_assist == null ? undefined : Number(usage.credits_ai_lead_assist) || 0,
        credits_ai_custom_dashboard:
          usage.credits_ai_custom_dashboard == null
            ? undefined
            : Number(usage.credits_ai_custom_dashboard) || 0,
        credits_ai_ads_copilot:
          usage.credits_ai_ads_copilot == null ? undefined : Number(usage.credits_ai_ads_copilot) || 0,
      },
      extra_operator_seats: Number(data.extra_operator_seats) || 0,
      operator_seat_price_uzs: data.operator_seat_price_uzs == null ? null : Number(data.operator_seat_price_uzs) || null,
      balance_uzs: Number(data.balance_uzs) || 0,
      channels: Array.isArray(data.channels) ? (data.channels as string[]) : undefined,
      agentic_mode: typeof data.agentic_mode === "boolean" ? data.agentic_mode : undefined,
      ai_feature_models:
        data.ai_feature_models && typeof data.ai_feature_models === "object"
          ? (data.ai_feature_models as BillingFeatures["ai_feature_models"])
          : undefined,
      periodKey: typeof data.periodKey === "string" ? data.periodKey : undefined,
      trialEndsAt: (data.trialEndsAt as string | null) ?? null,
      subscriptionEndsAt: (data.subscriptionEndsAt as string | null) ?? null,
      graceEndsAt: (data.graceEndsAt as string | null) ?? null,
    };
  },

  async rentOperatorSeat(workspaceId: string, quantity: number): Promise<RentOperatorSeatResponse> {
    return apiFetch(`/billing/operator-seat/rent?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: "POST",
      body: { quantity },
    });
  },

  // ── Invoices ──────────────────────────────────────────────────────────
  async listInvoices(workspaceId: string): Promise<BillingInvoice[]> {
    const res = await apiFetch<{ rows: BillingInvoice[] }>(`/billing/invoices?workspace_id=${encodeURIComponent(workspaceId)}`);
    return res.rows ?? [];
  },

  async getInvoice(workspaceId: string, id: string): Promise<BillingInvoice> {
    return apiFetch(`/billing/invoices/${encodeURIComponent(id)}?workspace_id=${encodeURIComponent(workspaceId)}`);
  },

  /** Charge a saved card, or the prepaid balance, for a pending subscription
   * renewal invoice (`subscription_order_id` from a `BillingInvoice`). */
  async chargeSubscription(
    workspaceId: string,
    body: { sub_id: string; card_id?: string; payment_method: "card" | "balance"; set_default?: boolean },
  ): Promise<ChargeSubscriptionResponse> {
    return apiFetch(`/billing/subscriptions/charge?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: "POST",
      body,
    });
  },

  /** Stops paying for one or more currently-unused premium seats. */
  async declineOperatorSeat(workspaceId: string, quantity = 1): Promise<DeclineSeatResponse> {
    return apiFetch(`/billing/operator-seat/decline?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: "POST",
      body: { quantity },
    });
  },

  // ── Payment cards (Paylov-backed, workspace-admin gated server-side) ───
  async listCards(workspaceId: string): Promise<SavedPaymentCard[]> {
    const res = await apiFetch<{ cards: SavedPaymentCard[] }>(`/billing/cards?workspace_id=${encodeURIComponent(workspaceId)}`);
    return res.cards ?? [];
  },

  async startAddCard(
    workspaceId: string,
    body: { card_number: string; expire_date: string; phone_number?: string },
  ): Promise<StartAddCardResponse> {
    return apiFetch(`/billing/cards?workspace_id=${encodeURIComponent(workspaceId)}`, { method: "POST", body });
  },

  async confirmAddCard(
    workspaceId: string,
    body: { card_id: string; otp: string; card_name?: string },
  ): Promise<ConfirmCardResponse> {
    return apiFetch(`/billing/cards/confirm?workspace_id=${encodeURIComponent(workspaceId)}`, { method: "POST", body });
  },

  async deleteCard(workspaceId: string, cardId: string): Promise<void> {
    await apiFetch(`/billing/cards/${encodeURIComponent(cardId)}/delete?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: "POST",
    });
  },

  async setDefaultCard(workspaceId: string, cardId: string): Promise<void> {
    await apiFetch(`/billing/cards/${encodeURIComponent(cardId)}/default?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: "POST",
    });
  },

  // ── Prepaid balance ──────────────────────────────────────────────────
  async getBalance(workspaceId: string): Promise<{ balance_uzs: number }> {
    return apiFetch(`/billing/balance?workspace_id=${encodeURIComponent(workspaceId)}`);
  },

  async topUpBalanceWithCard(
    workspaceId: string,
    body: { amount_uzs: number; card_id: string; set_default?: boolean },
  ): Promise<{ ok: boolean; balance_uzs?: number }> {
    return apiFetch(`/billing/balance/top-up?workspace_id=${encodeURIComponent(workspaceId)}`, { method: "POST", body });
  },

  /** Starts a Click/Paylov (Payme kill-switched, matching `RentSeatModal`)
   * checkout session for a balance top-up — returns provider URLs to open
   * in a popup. The actual credit happens async via the provider webhook;
   * callers poll `getBalance` for confirmation, same pattern as
   * `useSeatPurchasePolling`. */
  async topUpBalanceGateway(workspaceId: string, amountUzs: number): Promise<TopUpGatewayResponse> {
    return apiFetch(`/billing/balance/top-up/gateway?workspace_id=${encodeURIComponent(workspaceId)}`, {
      method: "POST",
      body: { amount_uzs: amountUzs },
    });
  },
};
