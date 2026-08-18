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
 * username, history sync, last-seen), media/sticker/GIF messages, message
 * edit/delete/forward/reactions, multi-select bulk actions, the entire
 * "agentic" AI auto-reply/automation subsystem (11 old-frontend files,
 * ~4,600 lines), canned responses, Instagram groups/automations, WhatsApp
 * (old frontend itself only ever shipped a "coming soon" placeholder for
 * it — reproduced as such here, not a fabricated fourth channel).
 */

export type ChannelKey = "telegram" | "instagram" | "sms" | "whatsapp" | "team";

// ---------------------------------------------------------------------------
// Telegram — `telegram-chats.controller.ts` / `telegram-meassages.controller.ts`
// ---------------------------------------------------------------------------

export interface TelegramChat {
  id: string;
  display_name?: string | null;
  system_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  chat_type?: string | null;
  source?: string | null;
  unread_count?: number;
  last_message_at?: string | null;
  last_message_preview?: string | null;
  assigned_to?: string | null;
  linked_lead_id?: string | null;
  conversation_closed_at?: string | null;
}

export interface TelegramMessage {
  id: string;
  chat_id: string;
  direction: "inbound" | "outbound";
  text_content?: string | null;
  message_kind?: string | null;
  status: "received" | "pending" | "sent" | "failed" | string;
  created_at: string;
  sender_id?: string | null;
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
}

export interface InstagramMessage {
  id: string;
  chat_id: string;
  direction: "inbound" | "outbound";
  text_content?: string | null;
  message_type?: string | null;
  media_url?: string | null;
  status: "received" | "pending" | "sent" | "failed" | string;
  created_at: string;
  sender_id?: string | null;
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
