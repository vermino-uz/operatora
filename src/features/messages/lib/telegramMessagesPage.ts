import type { TelegramMessage } from "@/features/messages/types";

export const TELEGRAM_MESSAGE_PAGE_SIZE = 100;

export function parseTelegramMessagesResponse(payload: unknown): { messages: TelegramMessage[]; hasMore: boolean } {
  if (Array.isArray(payload)) {
    return { messages: payload as TelegramMessage[], hasMore: false };
  }
  const body = payload as { messages?: unknown[]; has_more?: boolean };
  return {
    messages: Array.isArray(body.messages) ? (body.messages as TelegramMessage[]) : [],
    hasMore: Boolean(body.has_more),
  };
}
