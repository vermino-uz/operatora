/**
 * Eskiz SMS — traced from the old frontend's `EskizSettings.tsx`/
 * `EskizTopUpPanel.tsx`/`useEskiz.ts` against the real
 * `backend/src/eskiz/eskiz.controller.ts` (`/eskiz/*`) and
 * `backend/src/billing/billing.controller.ts`'s `POST /billing/eskiz/top-up`.
 * A real, dedicated module (own `eskiz_accounts`/`eskiz_templates`/
 * `eskiz_messages` tables), not the generic `/sms-gateways` CRUD.
 *
 * Scoped to what the settings sitemap subtitle promises ("Connect your
 * Eskiz account, manage templates, view SMS history and reports"):
 * account connect/disconnect, balance sync + wallet top-up, templates,
 * history, reports, guidance. Deliberately NOT built here (belongs to the
 * Messages feature, not Settings — see `EskizChannelPanel.tsx`/
 * `SmsChannelPanel.tsx` in the old frontend for where these actually
 * live): chats/messages listing, single-recipient send, bulk send to
 * leads. `/eskiz/*` uses `LenientChatAuthGuard` (workspace resolved from
 * the JWT even for a slightly-stale token) rather than the strict guard —
 * irrelevant here since `apiFetch` always sends a fresh Bearer token.
 */

export type EskizConnectionStatus = "connected" | "not_connected" | "disconnected" | "token_expired";

export interface EskizAccount {
  id: string;
  email: string;
  sender_id: string;
  balance_uzs: number | null;
  balance_synced_at: string | null;
  token_expires_at: string | null;
  user_eskiz_id: number | null;
  is_active: boolean;
  connection_status: EskizConnectionStatus;
}

export interface EskizGuidance {
  sms_price_uzs: number;
  low_balance_threshold_uzs: number;
  sections: Array<{ title: string; items: string[] }>;
}

export type EskizTemplateStatus = "pending" | "moderation" | "approved" | "rejected";

export interface EskizTemplate {
  id: string;
  content: string;
  status: EskizTemplateStatus;
  eskiz_template_id: number | null;
  submitted_at: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface EskizHistoryRow {
  id: string;
  text: string;
  status: string;
  error_message: string | null;
  eskiz_message_id: string | null;
  created_at: string;
  phone_number: string | null;
  display_name: string | null;
  template_content: string | null;
  sender_id: string | null;
}

export interface EskizHistoryPage {
  items: EskizHistoryRow[];
  total: number;
  page: number;
  limit: number;
}

export type EskizReportPeriod = "today" | "7d" | "30d" | "all";

export interface EskizReportsSummary {
  period: string;
  period_label: string;
  total_messages: number;
  sent: number;
  delivered: number;
  failed: number;
  pending: number;
  delivery_rate: number;
  estimated_cost_uzs: number;
}

export interface EskizConnectInput {
  email: string;
  password: string;
  sender_id?: string;
}

export type EskizTopUpProvider = "payme" | "click" | "paylov";

export interface EskizTopUpResult {
  message?: string;
  transactionId?: string;
  payment_url?: string;
  paylov_url?: string;
}
