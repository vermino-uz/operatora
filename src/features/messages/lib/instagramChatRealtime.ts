import type { QueryClient } from "@tanstack/react-query";

import { buildInstagramLastMessagePreview, mapInstagramConversationRow } from "@/features/messages/types";
import type { InstagramChat } from "@/features/messages/types";

const CHATS_KEY = ["instagram-chats"] as const;

export function patchInstagramChatInCache(
  queryClient: QueryClient,
  chatId: string,
  patch: Partial<InstagramChat>,
) {
  queryClient.setQueryData<InstagramChat[]>(CHATS_KEY, (old) =>
    old?.map((c) => (c.id === chatId ? { ...c, ...patch } : c)),
  );
}

/** Merge an `instagram:conversation-updated` socket row into the chat list cache. */
export function applyInstagramConversationUpdated(
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
    queryClient.setQueryData<InstagramChat[]>(CHATS_KEY, (old) => old?.filter((c) => c.id !== id));
    opts?.onDeleted?.(id);
    return;
  }

  let missing = false;
  queryClient.setQueryData<InstagramChat[]>(CHATS_KEY, (old) => {
    if (!old) return old;
    const exists = old.some((c) => c.id === id);
    if (!exists) {
      if (typeof raw.participant_username === "string" || typeof raw.participant_id === "string") {
        return [mapInstagramConversationRow(raw), ...old];
      }
      missing = true;
      return old;
    }
    const preview = buildInstagramLastMessagePreview(raw);
    return old.map((c) =>
      c.id === id
        ? {
            ...c,
            ...(raw.unread_count != null ? { unread_count: raw.unread_count as number } : {}),
            ...(typeof raw.last_message_at === "string" ? { last_message_at: raw.last_message_at } : {}),
            ...(typeof raw.participant_name === "string"
              ? { display_name: raw.participant_name }
              : typeof raw.participant_username === "string"
                ? { display_name: raw.participant_username }
                : {}),
            ...(typeof raw.participant_username === "string" ? { username: raw.participant_username } : {}),
            ...(typeof raw.participant_profile_pic === "string"
              ? { profile_pic: raw.participant_profile_pic }
              : {}),
            ...(preview !== undefined ? { last_message_preview: preview } : {}),
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
    );
  });
  if (missing) opts?.onMissingChat?.();
}
