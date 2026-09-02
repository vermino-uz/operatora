/**
 * Messages (`/messages`) — a live multi-channel chat inbox, genuinely
 * distinct from `src/features/conversations/` (that's a read-only AI-call
 * transcript review table; this is Telegram/Instagram/SMS + internal team
 * chat). See PROGRESS.md's dated "Messages — …" entries for the full
 * backend-tracing writeup, including the one genuinely surprising finding:
 * the old frontend files named in this feature's original brief
 * (`components/{TelegramMessages,InstagramMessages,SmsMessages}.tsx`) are
 * DEAD CODE, superseded by `components/messages/{TelegramChannelPanel,
 * InstagramChannelPanel,EskizChannelPanel}.tsx` (confirmed by grepping for
 * any remaining import of the old names — none exist outside their own
 * files). Every type below is hand-written from the real controllers, not
 * the old frontend's own local interfaces, though those were read to see
 * which fields are actually rendered.
 *
 * Scope of this rebuild (see PROGRESS.md for the full reasoning): real,
 * traced, core "read + send text" inbox for Telegram, Instagram and SMS
 * (Eskiz), plus internal Team Chat. Explicitly NOT ported (all real
 * backend capabilities, all deliberately out of scope for this pass —
 * each is individually larger than most whole features already built in
 * this app): Telegram "linked user account" mode (contacts, start-chat-by-
 * username, history sync, last-seen), sending/composing media (photo/
 * video/document/sticker/GIF uploads), the entire "agentic" AI auto-reply/
 * automation subsystem (11 old-frontend files, ~4,600 lines), canned
 * responses, Instagram groups/automations, WhatsApp (old frontend itself
 * only ever shipped a "coming soon" placeholder for it — reproduced as
 * such here, not a fabricated fourth channel).
 *
 * Telegram's per-message context menu (copy/reply/forward/react/edit/
 * delete/multi-select/save-image) — originally cut from this same list —
 * was later brought to full parity with the old frontend's
 * `TelegramMessageContextMenu.tsx`/`TelegramChannelPanel.tsx`; see
 * PROGRESS.md's dated "Messages — Telegram message context menu" entry.
 */

import { env } from "@/config/env";

export type ChannelKey = "telegram" | "instagram" | "sms" | "whatsapp" | "team";

// ---------------------------------------------------------------------------
// Telegram — `telegram-chats.controller.ts` / `telegram-meassages.controller.ts`
// ---------------------------------------------------------------------------

export interface TelegramChat {
  id: string;
  /** Telegram's own numeric chat/peer id — required for `t.me/c/…` message links. */
  telegram_chat_id?: number | null;
  /** Private-chat peer user id (linked-account / business rows). */
  telegram_user_id?: number | null;
  display_name?: string | null;
  system_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  phone?: string | null;
  chat_type?: string | null;
  source?: string | null;
  unread_count?: number;
  last_message_at?: string | null;
  last_message_preview?: string | null;
  assigned_to?: string | null;
  linked_lead_id?: string | null;
  conversation_closed_at?: string | null;
  avatar_checked_at?: string | null;
  /** Row is `select('*')`d server-side (`telegram-chats.service.ts`) — these
   * two decide which bot token `telegram-media` proxies media through for
   * this chat's messages (see `telegramMessageMediaUrl` below). */
  bot_integration_id?: string | null;
  business_connection_id?: string | null;
  /** Present on chats ingested via the linked user account (userbot). */
  user_session_id?: string | null;
  /** Operator took over from the AI agent — agent won't auto-reply until resumed. */
  agentic_paused?: boolean | null;
  /** Agent escalated — operator should open this chat. */
  needs_attention?: boolean | null;
  unseen_escalations?: number | null;
  /** True when the peer is a Telegram bot (still stored as chat_type private). */
  is_bot?: boolean | null;
  /** Telegram Chat Folder ids this chat belongs to (user-account mode). */
  folder_ids?: number[] | null;
}

export interface TelegramMessage {
  id: string;
  chat_id: string;
  direction: "inbound" | "outbound";
  text_content?: string | null;
  message_kind?: string | null;
  /** Backend `media_type` column — helps classify documents as video when `message_kind` is stale. */
  media_type?: string | null;
  status: "received" | "pending" | "sent" | "failed" | string;
  created_at: string;
  sender_id?: string | null;
  /** Telegram's own numeric message id (distinct from `id`, our row uuid) —
   * required to reply-to, react to, or resolve media for a message; not
   * every row has one yet (e.g. an optimistic bubble mid-flight). */
  telegram_message_id?: number | null;
  /** Resolved Telegram `file_id` for photo/sticker/etc. messages — present
   * once the row has media (`telegram-meassages.service.ts` backfills this
   * from `telegram_data` when absent). Powers `telegramMessageMediaUrl`. */
  file_id?: string | null;
  /** Per-message override of which bot proxies this message's media —
   * falls back to the chat's own `bot_integration_id` when absent. */
  bot_integration_id?: string | null;
  /** Set by `POST :id/edit` (outbound text messages only). */
  is_edited?: boolean;
  reply_to_message_id?: number | null;
  metadata?: {
    reply_preview?: { author: string; text: string } | null;
    /** The operator's own emoji reaction on this message (`POST :id/reaction`). */
    operator_reaction?: string | null;
    /** True when the AI agent sent this outbound message. */
    ai_generated?: boolean | null;
    voice_duration_sec?: number | null;
  } | null;
  /** Raw Bot API / TDLib payload — used to backfill kind/file_id client-side. */
  telegram_data?: Record<string, unknown> | null;
  /** Optimistic local blob URL while an outbound media send is in flight. */
  preview_url?: string | null;
}

/** Forum topic in a Telegram supergroup (TDLib linked account only). */
export interface TelegramForumTopic {
  forum_topic_id: number;
  name: string;
  icon_color?: number | null;
  is_general?: boolean;
  is_closed?: boolean;
  is_pinned?: boolean;
  unread_count?: number;
  last_message_date?: number | null;
}

// ---------------------------------------------------------------------------
// Instagram — `instagram.controller.ts` (`/instagram/conversations*`)
// ---------------------------------------------------------------------------

export interface InstagramChat {
  id: string;
  username?: string | null;
  display_name?: string | null;
  profile_pic?: string | null;
  last_message_at?: string | null;
  last_message_preview?: string | null;
  unread_count?: number;
  assigned_to?: string | null;
  linked_lead_id?: string | null;
  conversation_closed_at?: string | null;
  agentic_paused?: boolean | null;
  needs_attention?: boolean | null;
  unseen_escalations?: number | null;
}

export interface InstagramMessage {
  id: string;
  chat_id: string;
  direction: "inbound" | "outbound";
  text_content?: string | null;
  message_type?: string | null;
  media_url?: string | null;
  /** Optimistic local preview while a send is in flight (old frontend pattern). */
  preview_url?: string | null;
  media_type?: string | null;
  status: "received" | "pending" | "sent" | "failed" | string;
  created_at: string;
  sender_id?: string | null;
  metadata?: {
    ai_generated?: boolean | null;
    voice_duration_sec?: number | null;
  } | null;
}

// ---------------------------------------------------------------------------
// SMS — reuses `eskizSmsApi` (`src/services/api/eskizSms.ts`, built in the
// Leads SMS slice) and its `EskizAccount`/`EskizTemplate`/`EskizMessage`
// types from `features/leads/types`. `GET /eskiz/chats` row shape:
// ---------------------------------------------------------------------------

export interface SmsChat {
  id: string;
  phone_number: string;
  linked_lead_id: string | null;
}

// ---------------------------------------------------------------------------
// Team Chat — `messages-page/group-chat.controller.ts`
// (`/messages-page/group-chat*`). Uses the generic `messages` table +
// `team_chat_channels` table, real-time via the same generic
// `RealtimeService`/`messages:{workspaceId}` topic this app's socket
// client already speaks (`services/realtime/subscriptions.ts`).
// ---------------------------------------------------------------------------

export interface TeamChatChannel {
  id: string;
  workspace_id: string;
  name: string;
  description?: string | null;
  is_pinned?: boolean;
  is_archived?: boolean;
  write_roles?: string[] | null;
}

export interface TeamChatMessage {
  id: string;
  workspace_id?: string | null;
  channel_id?: string | null;
  sender_id: string;
  recipient_id?: string | null;
  content?: string | null;
  attachment_url?: string | null;
  reply_to_message_id?: string | null;
  message_type?: string | null;
  created_at: string;
}

export interface TeamChatProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
}

export interface TeamChatFeed {
  messages: TeamChatMessage[];
  profiles: TeamChatProfile[];
}

// ---------------------------------------------------------------------------
// Shared display helpers
// ---------------------------------------------------------------------------

export function telegramChatName(chat: TelegramChat): string {
  return (
    chat.display_name?.trim() ||
    [chat.first_name, chat.last_name].filter(Boolean).join(" ").trim() ||
    (chat.username ? `@${chat.username}` : "") ||
    chat.system_name?.trim() ||
    "Unknown"
  );
}

/** `GET /telegram-media/chat-avatar/:chatId` — public (no auth), the
 * backend resolves/caches the Telegram file_id server-side and streams the
 * image bytes directly, so this is usable straight as an `<img src>`. 404s
 * (no photo, or a bot-mode chat with no resolvable file) fall back to
 * initials wherever this is rendered — same "one cache-busted URL, browser
 * handles the 404" pattern as the old frontend's own `chatAvatarUrl`. */
export function telegramChatAvatarUrl(chat: TelegramChat): string {
  const bust = chat.avatar_checked_at ? `?v=${new Date(chat.avatar_checked_at).getTime()}` : "";
  return `${env.apiBaseUrl}/telegram-media/chat-avatar/${encodeURIComponent(chat.id)}${bust}`;
}

export { telegramMessageMediaUrl } from "@/features/messages/lib/telegramMedia";

export function isTelegramAccountChat(chat: TelegramChat): boolean {
  return chat.source === "user_account" || Boolean(chat.user_session_id);
}

/** 1:1 human chats only — excludes bots, groups, supergroups, and channels. */
export function isTelegramPrivateChat(chat: TelegramChat): boolean {
  if (chat.is_bot) return false;
  const type = chat.chat_type;
  if (!type) return true; // legacy rows without chat_type default to private
  return type === "private";
}

export function isTelegramBotChat(chat: TelegramChat): boolean {
  return chat.is_bot === true || chat.chat_type === "bot";
}

export function isTelegramGroupChat(chat: TelegramChat): boolean {
  return chat.chat_type === "group" || chat.chat_type === "supergroup";
}

export function isTelegramChannelChat(chat: TelegramChat): boolean {
  return chat.chat_type === "channel";
}

export function telegramAccountAvatarUrl(workspaceId: string, avatarCheckedAt?: string | null): string {
  const bust = avatarCheckedAt ? `?v=${new Date(avatarCheckedAt).getTime()}` : "";
  return `${env.apiBaseUrl}/telegram-media/account-avatar/${encodeURIComponent(workspaceId)}${bust}`;
}

/** Human-readable last-seen line for a private user-account chat. */
export function formatTelegramLastSeen(data: { status?: string | null; last_online_date?: number | null } | null): string | null {
  if (!data) return null;
  if (data.status === "online") return "online";
  if (data.status === "recently") return "last seen recently";
  if (data.last_online_date) {
    const d = new Date(data.last_online_date * 1000);
    if (!Number.isNaN(d.getTime())) {
      return `last seen ${d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`;
    }
  }
  if (data.status === "hidden") return "last seen hidden";
  return null;
}

export function instagramChatName(chat: InstagramChat): string {
  return chat.display_name?.trim() || (chat.username ? `@${chat.username}` : "") || "Unknown";
}

export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function profileName(profile: TeamChatProfile | undefined | null, fallbackId?: string | null): string {
  return profile?.full_name?.trim() || profile?.email?.trim() || (fallbackId ? `User ${fallbackId.slice(0, 8)}` : "Unknown");
}
