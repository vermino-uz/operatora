"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { leadConversationLinksApi } from "@/services/api/leadConversationLinks";

function linkedKey(leadId: string) {
  return ["lead-linked-conversations", leadId] as const;
}

export function useLeadLinkedConversationsQuery(leadId: string, enabled: boolean) {
  return useQuery({
    queryKey: linkedKey(leadId),
    queryFn: () => leadConversationLinksApi.listLinked(leadId),
    enabled: enabled && Boolean(leadId),
  });
}

export function useLeadConversationLinkMutations(leadId: string) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: linkedKey(leadId) });

  const link = useMutation({
    mutationFn: (conversationId: string) => leadConversationLinksApi.link(conversationId, leadId),
    onSuccess: invalidate,
  });

  const unlink = useMutation({
    mutationFn: (conversationId: string) => leadConversationLinksApi.unlink(conversationId),
    onSuccess: invalidate,
  });

  return { link, unlink };
}
