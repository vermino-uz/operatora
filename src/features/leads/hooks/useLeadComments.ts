"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { leadCommentsApi } from "@/services/api/leads";

function commentsKey(leadId: string) {
  return ["lead-comments", leadId] as const;
}

/** Fetch-on-demand — only enabled while the Comments tab is actually
 * mounted (caller passes `enabled`), matching the Conversations feature's
 * `useConversationAudio` "lazy, not eager on open" precedent so opening the
 * details drawer never fires all seven tabs' queries at once. */
export function useLeadCommentsQuery(leadId: string, enabled: boolean) {
  return useQuery({
    queryKey: commentsKey(leadId),
    queryFn: () => leadCommentsApi.list(leadId),
    enabled: enabled && Boolean(leadId),
  });
}

export function useLeadCommentMutations(leadId: string) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: commentsKey(leadId) });

  const create = useMutation({
    mutationFn: ({ content, imageUrls }: { content: string; imageUrls: string[] }) =>
      leadCommentsApi.create(leadId, content, imageUrls),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (commentId: string) => leadCommentsApi.remove(commentId),
    onSuccess: invalidate,
  });

  const upload = useMutation({
    mutationFn: (file: File) => leadCommentsApi.upload(file),
  });

  return { create, remove, upload };
}
