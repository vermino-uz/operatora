"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { leadConversationLinksApi } from "@/services/api/leadConversationLinks";
import { conversationQueryKey } from "@/features/conversations/hooks/useConversationQuery";

/**
 * Phase 2c-12 — the Conversations-side mirror of Phase 2c-4's
 * `useLeadConversationLinkMutations` (`features/leads/hooks/
 * useLeadConversationLinks.ts`). Same underlying `leadConversationLinksApi`
 * (writes `conversations.entities` jsonb via the cast-safe `values` proxy
 * path, see that file's own doc comment for the traced `cs`/`contains`
 * landmine this avoids) — reused, not duplicated. Only the cache
 * invalidation differs: this side owns the single conversation's own detail
 * query, not a lead's linked-conversations list.
 */
export function useConversationLeadLinkMutations(conversationId: string) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: conversationQueryKey(conversationId) });

  const link = useMutation({
    mutationFn: (leadId: string) => leadConversationLinksApi.link(conversationId, leadId),
    onSuccess: invalidate,
  });

  const unlink = useMutation({
    mutationFn: () => leadConversationLinksApi.unlink(conversationId),
    onSuccess: invalidate,
  });

  return { link, unlink };
}
