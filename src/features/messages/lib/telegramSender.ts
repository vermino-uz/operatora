import {
  initialsFor,
  isTelegramPrivateChat,
  telegramChatAvatarUrl,
  telegramChatName,
  type TelegramChat,
  type TelegramMessage,
} from "@/features/messages/types";
import {
  extractTelegramMessageFrom,
  isTelegramGroupLikeChat,
  type TelegramMessageFrom,
} from "@/features/messages/lib/telegramUserAvatar";

export interface TelegramInboundAvatar {
  color: string;
  initials: string;
  /** Ready-to-use image URL (1:1 private chats via `chat-avatar`). */
  url?: string;
  /** Group member id — photo is fetched async in `TelegramUserAvatar`. */
  telegramUserId?: number;
}

const TG_AVATAR_PALETTE = ["#26A5E4", "#3b82f6", "#0ea5e9", "#06b6d4", "#0891b2"];
const OPERATOR_AVATAR_PALETTE = ["#7c3aed", "#059669", "#dc2626", "#d97706", "#0891b2"];

export interface TelegramOutboundAvatar {
  color: string;
  initials: string;
}

export function pickAvatarColor(seed: string, palette: string[] = TG_AVATAR_PALETTE): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return palette[Math.abs(hash) % palette.length]!;
}

/** Outbound teammate label + initials avatar beside operator-sent bubbles. */
export function resolveOutboundOperatorMark(
  senderId: string | undefined,
  profiles: Record<string, { name: string; initials: string }>,
): { senderName?: string; outboundAvatar?: TelegramOutboundAvatar } {
  if (!senderId) return {};
  const profile = profiles[senderId];
  const name = profile?.name || "Team member";
  const initials = profile?.initials || initialsFor(name);
  return {
    senderName: name,
    outboundAvatar: {
      color: pickAvatarColor(senderId, OPERATOR_AVATAR_PALETTE),
      initials,
    },
  };
}

function nameFromTelegramFrom(from: TelegramMessageFrom | null | undefined): string | null {
  if (!from) return null;
  const full = [from.first_name, from.last_name].filter(Boolean).join(" ").trim();
  return full || (from.username ? `@${from.username}` : null);
}

export interface TelegramAccountSessionIdentity {
  first_name?: string | null;
  last_name?: string | null;
  telegram_username?: string | null;
}

/** Outbound label for linked Telegram account sends — prefer Telegram identity over workspace profile. */
export function resolveTelegramAccountOutboundMark(
  message: TelegramMessage,
  profiles: Record<string, { name: string; initials: string }>,
  accountSession?: TelegramAccountSessionIdentity | null,
): { senderName?: string; outboundAvatar?: TelegramOutboundAvatar } {
  const from = extractTelegramMessageFrom(message);
  const tgName = nameFromTelegramFrom(from);
  if (tgName) {
    const seed = String(from?.id ?? tgName);
    return {
      senderName: tgName,
      outboundAvatar: {
        color: pickAvatarColor(seed, OPERATOR_AVATAR_PALETTE),
        initials: initialsFor(tgName),
      },
    };
  }

  if (accountSession) {
    const sessionName =
      [accountSession.first_name, accountSession.last_name].filter(Boolean).join(" ").trim() ||
      (accountSession.telegram_username ? `@${accountSession.telegram_username}` : null);
    if (sessionName) {
      return {
        senderName: sessionName,
        outboundAvatar: {
          color: pickAvatarColor(sessionName, OPERATOR_AVATAR_PALETTE),
          initials: initialsFor(sessionName),
        },
      };
    }
  }

  return resolveOutboundOperatorMark(message.sender_id ?? undefined, profiles);
}

/** Inbound sender label + avatar for Telegram group and private threads. */
export function resolveTelegramMessageSender(
  message: TelegramMessage,
  chat: TelegramChat,
): { senderName?: string; inboundAvatar?: TelegramInboundAvatar } {
  if (message.direction !== "inbound") return {};

  const from = extractTelegramMessageFrom(message);

  if (isTelegramGroupLikeChat(chat, message)) {
    const senderName = nameFromTelegramFrom(from);
    if (!senderName) return {};
    const seed = String(from?.id ?? senderName);
    return {
      senderName,
      inboundAvatar: {
        color: pickAvatarColor(seed),
        initials: initialsFor(senderName),
        telegramUserId: from?.id,
      },
    };
  }

  if (!isTelegramPrivateChat(chat)) return {};

  const senderName = telegramChatName(chat);
  return {
    senderName,
    inboundAvatar: {
      color: pickAvatarColor(chat.id),
      initials: initialsFor(senderName),
      url: telegramChatAvatarUrl(chat),
    },
  };
}
