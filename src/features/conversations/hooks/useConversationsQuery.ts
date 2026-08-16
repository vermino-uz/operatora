"use client";

import { useQuery } from "@tanstack/react-query";
import { conversationsApi } from "@/services/api/conversations";
import type { ConversationListParams } from "@/features/conversations/types";

export function conversationsQueryKey(workspaceId: string | null, params: ConversationListParams) {
  return ["conversations", "list", workspaceId, params] as const;
}

/** Server state for the paginated conversations list. Plain fetch-on-mount +
 * fetch-on-filter-change — no realtime subscription for this list (the old
 * app has none either, confirmed by reading its source; see brief). */
export function useConversationsQuery(workspaceId: string | null, params: ConversationListParams) {
  return useQuery({
    queryKey: conversationsQueryKey(workspaceId, params),
    queryFn: () => conversationsApi.list(workspaceId as string, params),
    enabled: Boolean(workspaceId),
    staleTime: 15_000,
    placeholderData: (prev) => prev,
  });
}
