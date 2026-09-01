import { apiFetch } from "@/services/api/client";
import type { TelegramChat, TelegramMessage } from "@/features/messages/types";

/**
 * Messages — Telegram channel. Traced directly against
 * `telegram-chats.controller.ts` (`/telegram-chats*`) and
 * `telegram-meassages.controller.ts` (`/telegram-meassages*`). Read/send
 * text plus the per-message action set (reply/edit/delete/react/forward)
 * — see `features/messages/types.ts`'s header comment for what's still
 * deliberately not built (userbot/account mode, composing/sending media,
 * sync-history, the agentic AI subsystem).
 */
export const telegramChatsApi = {
  /** `GET /telegram-chats` — paginated, most-recent-first. Pass `mode`:
   * `business_bot` (default) or `user_account` for the linked userbot inbox. */
  async list(params: {
    workspaceId: string;
    limit?: number;
    offset?: number;
    search?: string;
    mode?: "business_bot" | "user_account";
  }): Promise<TelegramChat[]> {
    const qs = new URLSearchParams({ workspace_id: params.workspaceId });
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.offset) qs.set("offset", String(params.offset));
    if (params.search) qs.set("search", params.search);
    if (params.mode) qs.set("mode", params.mode);
    const data = await apiFetch<TelegramChat[]>(`/telegram-chats?${qs.toString()}`);
    return Array.isArray(data) ? data : [];
  },

  /** `POST /telegram-chats/:id/sync-history` — pull older messages from
   * Telegram for a linked user-account chat. */
  async syncHistory(
    chatId: string,
    workspaceId: string,
    opts?: { offsetId?: number; limit?: number; forumTopicId?: number },
  ): Promise<{ synced?: number; has_more?: boolean }> {
    const qs = new URLSearchParams({ workspace_id: workspaceId });
    if (opts?.offsetId != null) qs.set("offset_id", String(opts.offsetId));
    if (opts?.limit != null) qs.set("limit", String(opts.limit));
    if (opts?.forumTopicId != null) qs.set("forum_topic_id", String(opts.forumTopicId));
    return apiFetch(`/telegram-chats/${encodeURIComponent(chatId)}/sync-history?${qs.toString()}`, { method: "POST" });
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

  /** `POST /telegram-meassages/start-chat` — open a DM by @username
   * (linked user-account mode). */
  async startChatByUsername(username: string): Promise<TelegramChat> {
    return apiFetch<TelegramChat>(`/telegram-meassages/start-chat`, {
      method: "POST",
      body: { username: username.replace(/^@/, "") },
    });
  },

  /** `POST /telegram-meassages/send` — text only (no outbound media in
   * this pass). Requires `telegram`/`create` RBAC permission server-side.
   * `replyToMessageId` is Telegram's own numeric message id (not our row
   * uuid) — see `resolveTelegramMsgId` usage at the call site. */
  async send(payload: {
    chatId: string;
    text: string;
    senderId?: string;
    replyToMessageId?: number | null;
    forumTopicId?: number;
  }): Promise<TelegramMessage> {
    return apiFetch<TelegramMessage>(`/telegram-meassages/send`, {
      method: "POST",
      body: {
        chat_id: payload.chatId,
        text_content: payload.text,
        sender_id: payload.senderId,
        reply_to_message_id: payload.replyToMessageId ?? undefined,
        forum_topic_id: payload.forumTopicId,
      },
    });
  },

  /** `POST /telegram-meassages/:id/reaction` — set (`emoji`) or remove
   * (`null`) the operator's own quick-reaction on a message. */
  async react(messageId: string, emoji: string | null): Promise<TelegramMessage> {
    return apiFetch<TelegramMessage>(`/telegram-meassages/${encodeURIComponent(messageId)}/reaction`, {
      method: "POST",
      body: { emoji },
    });
  },

  /** `POST /telegram-meassages/:id/edit` — outbound text messages only,
   * enforced server-side (`telegram`/`edit` RBAC permission). */
  async edit(messageId: string, text: string): Promise<TelegramMessage> {
    return apiFetch<TelegramMessage>(`/telegram-meassages/${encodeURIComponent(messageId)}/edit`, {
      method: "POST",
      body: { text_content: text },
    });
  },

  /** `POST /telegram-meassages/:id/telegram-delete` — deletes on Telegram
   * itself, not just the local row (`telegram`/`delete` RBAC permission).
   * Pass `revoke: false` to hide for the linked account / inbox only. */
  async remove(messageId: string, opts?: { revoke?: boolean }): Promise<void> {
    await apiFetch<unknown>(`/telegram-meassages/${encodeURIComponent(messageId)}/telegram-delete`, {
      method: "POST",
      body: { revoke: opts?.revoke !== false },
    });
  },

  /** `POST /telegram-meassages/forward` — forwards one or more messages
   * from `sourceChatId` to `targetChatId` (`telegram`/`create` RBAC
   * permission, same as `send`). */
  async forward(payload: {
    sourceChatId: string;
    targetChatId: string;
    messageIds: string[];
    senderId?: string;
  }): Promise<{ forwarded?: number }> {
    return apiFetch<{ forwarded?: number }>(`/telegram-meassages/forward`, {
      method: "POST",
      body: {
        source_chat_id: payload.sourceChatId,
        target_chat_id: payload.targetChatId,
        message_ids: payload.messageIds,
        sender_id: payload.senderId,
      },
    });
  },
};

/** `GET /telegram-media/:fileId` proxy download ("Save image"). Deliberately
 * a plain `fetch`, not `apiFetch`: the endpoint is public/unauthenticated
 * (no `JwtAuthGuard` on `TelegramMediaController`) and streams raw binary,
 * not JSON — `apiFetch`'s `rawRequest` always attaches a Bearer header and
 * always `JSON.parse`s the response body, neither of which apply here.
 * Kept in the API layer (not a component) so it's still the one place a
 * Telegram media request is made from, mirroring the old frontend's own
 * `downloadAuthenticatedMedia` helper. */
export async function downloadTelegramMedia(url: string, fallbackFileName: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Download failed (${res.status})`);
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fallbackFileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}
