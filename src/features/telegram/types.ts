/**
 * Telegram bot integration — traced from the old frontend's
 * `TelegramIntegration.tsx` against the real
 * `telegram-controller/telegram-integration/telegram-integration.controller.ts`
 * (`/telegram-integration/*`). A workspace may have several bot
 * integrations (e.g. a support bot + a sales bot); `create`/`remove` are
 * workspace-owner-gated server-side (`assertWorkspaceOwner`), the rest
 * (list/get/update/test/webhook actions) only require an authenticated
 * member of the workspace.
 *
 * NOT the same thing as the Departments feature's per-member
 * `telegram_username`/`telegram_chat_id` fields (`features/departments/`)
 * — those are free-text fields on a department member row, not backed by
 * any bot-integration or contacts-list endpoint. There is no shared
 * "Telegram contacts" endpoint to reuse/extend here; confirmed by reading
 * `features/departments/components/MemberRow.tsx` directly, which never
 * calls a contacts-list API at all.
 */
export interface TelegramIntegration {
  id: string;
  workspace_id: string;
  bot_token: string;
  bot_username: string | null;
  webhook_url: string | null;
  is_active: boolean;
  last_health_status: string | null;
  last_error: string | null;
  last_health_check_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
}

export interface TelegramTestResult {
  success: true;
  bot_info: TelegramBotInfo;
}

export interface TelegramWebhookInfo {
  url?: string;
  has_custom_certificate?: boolean;
  pending_update_count?: number;
  last_error_date?: number;
  last_error_message?: string;
  last_synchronization_error_date?: number;
}

export interface TelegramWebhookInfoResult {
  success: true;
  webhook_info: TelegramWebhookInfo;
}
