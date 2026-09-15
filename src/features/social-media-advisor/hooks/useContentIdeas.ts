"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { contentIdeasApi, savedContentIdeasApi } from "@/services/api/contentIdeas";
import type { ContentIdeaInput, ContentIdeaRow } from "@/features/social-media-advisor/types";

function ideasKey(workspaceId: string | null) {
  return ["content-ideas", workspaceId ?? "none"] as const;
}

function savedKey(workspaceId: string | null) {
  return ["saved-content-ideas", workspaceId ?? "none"] as const;
}

export function useContentIdeasQuery(workspaceId: string | null) {
  return useQuery({
    queryKey: ideasKey(workspaceId),
    queryFn: () => contentIdeasApi.list(),
    enabled: Boolean(workspaceId),
  });
}

export function useCreateContentIdeaMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ContentIdeaInput) => contentIdeasApi.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ideasKey(workspaceId) }),
  });
}

export function useSetContentIdeaStatusMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "done" }) => contentIdeasApi.setStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ideasKey(workspaceId) }),
  });
}

export function useDeleteContentIdeaMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => contentIdeasApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ideasKey(workspaceId) }),
  });
}

export function useSavedContentIdeasQuery(workspaceId: string | null) {
  return useQuery({
    queryKey: savedKey(workspaceId),
    queryFn: () => savedContentIdeasApi.list(),
    enabled: Boolean(workspaceId),
  });
}

export function useSaveContentIdeaMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (idea: ContentIdeaRow) => savedContentIdeasApi.save(idea),
    onSuccess: () => qc.invalidateQueries({ queryKey: savedKey(workspaceId) }),
  });
}

export function useDeleteSavedContentIdeaMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => savedContentIdeasApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: savedKey(workspaceId) }),
  });
}
