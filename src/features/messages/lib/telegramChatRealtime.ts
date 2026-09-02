import type { QueryClient } from "@tanstack/react-query";

import type { TelegramChat } from "@/features/messages/types";

type ChatPages = { pages: TelegramChat[][]; pageParams: unknown[] };

/** Merge a `telegram:chat-updated` socket row into all telegram-chats caches. */
export function applyTelegramChatUpdated(
  queryClient: QueryClient,
  raw: Record<string, unknown>,
  opts?: {
    onDeleted?: (chatId: string) => void;
    onMissingChat?: () => void;
  },
): void {
  const id = typeof raw.id === "string" ? raw.id : undefined;
  if (!id) return;

  if (raw.deleted_at) {
    queryClient.setQueriesData<ChatPages>({ queryKey: ["telegram-chats"] }, (old) => {
      if (!old?.pages) return old;
      return {
        ...old,
        pages: old.pages.map((page) => page.filter((c) => c.id !== id)),
      };
    });
    opts?.onDeleted?.(id);
    return;
  }

  let missing = false;
  queryClient.setQueriesData<ChatPages>({ queryKey: ["telegram-chats"] }, (old) => {
    if (!old?.pages) return old;
    const exists = old.pages.some((page) => page.some((c) => c.id === id));
    if (!exists) {
      if (raw.telegram_chat_id != null && typeof raw.display_name === "string") {
        const chat = raw as unknown as TelegramChat;
        const pages = old.pages.map((page, idx) => (idx === 0 ? [chat, ...page] : page));
        return { ...old, pages };
      }
      missing = true;
      return old;
    }
    return {
      ...old,
      pages: old.pages.map((page) =>
        page.map((c) =>
          c.id === id
            ? {
                ...c,
                ...(raw.unread_count != null ? { unread_count: raw.unread_count as number } : {}),
                ...(typeof raw.last_message_at === "string" ? { last_message_at: raw.last_message_at } : {}),
                ...(typeof raw.display_name === "string" ? { display_name: raw.display_name } : {}),
                ...(typeof raw.username === "string" ? { username: raw.username } : {}),
                ...(typeof raw.last_message_preview === "string"
                  ? { last_message_preview: raw.last_message_preview }
                  : {}),
                ...("assigned_to" in raw ? { assigned_to: (raw.assigned_to as string | null) ?? null } : {}),
                ...(typeof raw.agentic_paused === "boolean" ? { agentic_paused: raw.agentic_paused } : {}),
                ...(typeof raw.needs_attention === "boolean" ? { needs_attention: raw.needs_attention } : {}),
                ...(typeof raw.unseen_escalations === "number"
                  ? { unseen_escalations: raw.unseen_escalations }
                  : {}),
                ...(typeof raw.conversation_closed_at === "string" || raw.conversation_closed_at === null
                  ? { conversation_closed_at: raw.conversation_closed_at as string | null }
                  : {}),
                ...(typeof raw.linked_lead_id === "string" || raw.linked_lead_id === null
                  ? { linked_lead_id: raw.linked_lead_id as string | null }
                  : {}),
              }
            : c,
        ),
      ),
    };
  });
  if (missing) opts?.onMissingChat?.();
}
