"use client";

import { useQuery } from "@tanstack/react-query";
import { conversationsApi } from "@/services/api/conversations";

export function conversationQueryKey(id: string | null) {
  return ["conversations", "detail", id] as const;
}

/** Server state for a single conversation's full detail (transcript,
 * scoring, summary, etc). Only fires once a row is selected. */
export function useConversationQuery(id: string | null) {
  return useQuery({
    queryKey: conversationQueryKey(id),
    queryFn: () => conversationsApi.get(id as string),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}
