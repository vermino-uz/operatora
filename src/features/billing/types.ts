/**
 * Billing & Usage settings section — traced from the old frontend's
 * `BillingUsagePanel.tsx` + `PaymentCardsPanel.tsx` + `WorkspaceBalancePanel.tsx`
 * + `lib/billingPaymentApi.ts`, against the real `billing.controller.ts`.
 * Plan/usage/balance summary reuses the already-built `BillingFeatures`
 * (`GET /billing/me`, extended — see `features/team/types.ts`); this file
 * only adds the types unique to invoices/cards/top-up.
 */

export interface InvoiceLineItem {
  key: string;
  label: string;
  quantity: number;
  unit_uzs: number;
  months: number;
  amount_uzs: number;
}

export interface BillingInvoice {
  id: string;
  kind: string;
  provider: string | null;
  amount_uzs: number;
  status: string;
  external_order_id: string | null;
  plan_name: string | null;
  cycle: string | null;
  payment_method: string | null;
  subscription_order_id: string | null;
  purpose: string | null;
  line_items: InvoiceLineItem[];
  paid_at: string | null;
  created_at: string | null;
  vacant_operator_seats: number | null;
}

export interface SavedPaymentCard {
  id: string;
  paylov_card_id: string;
  card_name: string | null;
  masked_pan: string | null;
  vendor: string | null;
  is_default: boolean;
  created_at: string;
}

export interface StartAddCardResponse {
  card_id: string;
  otp_sent_phone: string;
  pending: true;
}

export interface ConfirmCardResponse {
  id: string;
  paylov_card_id: string;
  card_name: string | null;
  masked_pan: string | null;
  vendor: string | null;
  status: string;
  is_default: boolean;
}

export interface TopUpGatewayResponse {
  ok: boolean;
  transaction_id: string;
  external_order_id: string;
  payment_url: string | null;
  payme_url: string | null;
  click_url: string | null;
  paylov_url?: string | null;
  paylov_invoice_id?: number | null;
  stub: boolean;
}

export interface ChargeSubscriptionResponse {
  ok: boolean;
  tier?: string;
}

export interface DeclineSeatResponse {
  ok: boolean;
  extra_operator_seats: number;
  declined: number;
}

/** `PAYME_PAYMENTS_ENABLED` kill-switch — same precedent as
 * `RentSeatModal.tsx`, off by default. */
export const PAYME_PAYMENTS_ENABLED = process.env.NEXT_PUBLIC_PAYME_PAYMENTS_ENABLED === "1";

export function formatSom(n: number): string {
  return `${new Intl.NumberFormat("uz-UZ").format(Math.round(n))} so'm`;
}
