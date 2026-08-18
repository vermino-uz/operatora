import { apiFetch } from "@/services/api/client";
import type { TelegramChat, TelegramMessage } from "@/features/messages/types";

/**
 * Messages — Telegram channel. Traced directly against
 * `telegram-chats.controller.ts` (`/telegram-chats*`) and
 * `telegram-meassages.controller.ts` (`/telegram-meassages*`). Scoped to
 * the read+send text subset this rebuild's inbox MVP needs — see
 * `features/messages/types.ts`'s header comment for what's deliberately
 * not built (userbot/account mode, media, reactions, edit/delete/forward,
 * sync-history, the agentic AI subsystem).
 */
export const telegramChatsApi = {
  /** `GET /telegram-chats` — paginated, most-recent-first. `mode` is
   * omitted here (defaults to the bot/business inbox, not the userbot
   * "account" mode this rebuild doesn't build a panel for). */
  async list(params: { workspaceId: string; limit?: number; offset?: number; search?: string }): Promise<TelegramChat[]> {
    const qs = new URLSearchParams({ workspace_id: params.workspaceId });
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.offset) qs.set("offset", String(params.offset));
    if (params.search) qs.set("search", params.search);
    const data = await apiFetch<TelegramChat[]>(`/telegram-chats?${qs.toString()}`);
    return Array.isArray(data) ? data : [];
  },

  /** `PATCH /telegram-chats/:id/read` — resets `unread_count` to 0. */
  async markRead(id: string, workspaceId: string): Promise<TelegramChat> {
    return apiFetch<TelegramChat>(
      `/telegram-chats/${encodeURIComponent(id)}/read?workspace_id=${encodeURIComponent(workspaceId)}`,
      { method: "PATCH" },
    );
  },

  /** `PATCH /telegram-chats/:id/link-lead` — pass `null` to unlink. */
  async linkLead(id: string, workspaceId: string, leadId: string | null): Promise<TelegramChat> {
    return apiFetch<TelegramChat>(
      `/telegram-chats/${encodeURIComponent(id)}/link-lead?workspace_id=${encodeURIComponent(workspaceId)}`,
      { method: "PATCH", body: { lead_id: leadId } },
    );
  },
};

export const telegramMessagesApi = {
  /** `GET /telegram-meassages?chat_id=` (workspace derived from the JWT). */
  async list(chatId: string): Promise<TelegramMessage[]> {
    const data = await apiFetch<TelegramMessage[]>(`/telegram-meassages?chat_id=${encodeURIComponent(chatId)}`);
    return Array.isArray(data) ? data : [];
  },

  /** `POST /telegram-meassages/send` — text only (no media/reply in this
   * pass). Requires `telegram`/`create` RBAC permission server-side. */
  async send(payload: { chatId: string; text: string }): Promise<TelegramMessage> {
    return apiFetch<TelegramMessage>(`/telegram-meassages/send`, {
      method: "POST",
      body: { chat_id: payload.chatId, text_content: payload.text },
    });
  },
};
