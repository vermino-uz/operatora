"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { leadTagsApi } from "@/services/api/leadTags";

/** Workspace-wide catalog — shared across every lead's tag picker, one
 * fetch. */
export function useLeadTagCatalogQuery(enabled: boolean) {
  return useQuery({
    queryKey: ["lead-tags-catalog"],
    queryFn: () => leadTagsApi.listCatalog(),
    enabled,
  });
}

export function useLeadAssignedTagsQuery(leadId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["lead-tag-assignments", leadId],
    queryFn: () => leadTagsApi.listAssignedTagIds(leadId),
    enabled: enabled && Boolean(leadId),
  });
}

export function useLeadTagMutations(leadId: string) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["lead-tags-catalog"] });
    queryClient.invalidateQueries({ queryKey: ["lead-tag-assignments", leadId] });
  };

  const createTag = useMutation({
    mutationFn: ({ name, color }: { name: string; color?: string }) => leadTagsApi.getOrCreateTag(name, color),
    onSuccess: invalidate,
  });

  const setTags = useMutation({
    mutationFn: (tagIds: string[]) => leadTagsApi.setLeadTags(leadId, tagIds),
    onSuccess: invalidate,
  });

  // Catalog-wide delete — clears the tag's assignments on every lead, not
  // just this one, so every open assigned-tags query needs invalidating.
  const deleteTag = useMutation({
    mutationFn: (tagId: string) => leadTagsApi.deleteTag(tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-tags-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["lead-tag-assignments"] });
    },
  });

  return { createTag, setTags, deleteTag };
}
