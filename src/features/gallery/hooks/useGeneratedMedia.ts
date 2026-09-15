import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { generatedMediaApi } from "@/services/api/generatedMedia";
import type { GalleryKindFilter, GallerySourceFilter, GeneratedMediaItem } from "@/features/gallery/types";

const listKey = (workspaceId: string | null, source: GallerySourceFilter, kind: GalleryKindFilter) =>
  ["generated-media", workspaceId ?? "none", source, kind] as const;
const quotaKey = (workspaceId: string | null) => ["generated-media-quota", workspaceId ?? "none"] as const;

export function useGeneratedMediaQuery(
  workspaceId: string | null,
  filters: { source: GallerySourceFilter; kind: GalleryKindFilter },
) {
  return useQuery({
    queryKey: listKey(workspaceId, filters.source, filters.kind),
    queryFn: () =>
      generatedMediaApi.list(workspaceId as string, {
        source: filters.source,
        kind: filters.kind,
        limit: 60,
      }),
    enabled: !!workspaceId,
    staleTime: 30_000,
    // A new image generated from AI Chat must show up here on next visit —
    // don't serve a stale persisted cache entry.
    refetchOnMount: "always",
  });
}

export function useGeneratedMediaQuotaQuery(workspaceId: string | null) {
  return useQuery({
    queryKey: quotaKey(workspaceId),
    queryFn: () => generatedMediaApi.quota(workspaceId as string),
    enabled: !!workspaceId,
    staleTime: 30_000,
  });
}

function invalidateAllFor(qc: ReturnType<typeof useQueryClient>, workspaceId: string | null) {
  void qc.invalidateQueries({ queryKey: ["generated-media", workspaceId ?? "none"] });
  void qc.invalidateQueries({ queryKey: quotaKey(workspaceId) });
}

export function useUploadSourceMediaMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => generatedMediaApi.uploadSource(workspaceId as string, file),
    onSuccess: () => invalidateAllFor(qc, workspaceId),
  });
}

export function useDeleteGeneratedMediaMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => generatedMediaApi.remove(workspaceId as string, id),
    onSuccess: () => invalidateAllFor(qc, workspaceId),
  });
}

/** Regenerate with the same prompt (and source image, if the original was
 * an edit) — a fresh quota-consuming generation, not an in-place mutation. */
export function useRegenerateMediaMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (item: GeneratedMediaItem) =>
      generatedMediaApi.generate(workspaceId as string, {
        prompt: item.prompt,
        sourceMediaId: item.sourceMediaId ?? undefined,
      }),
    onSuccess: () => invalidateAllFor(qc, workspaceId),
  });
}

export function useCatalogizeMediaMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mediaIds: string[]) => generatedMediaApi.catalogize(workspaceId as string, { mediaIds }),
    onSuccess: () => invalidateAllFor(qc, workspaceId),
  });
}

export function useEditMediaMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { mediaIds: string[]; instruction: string }) =>
      generatedMediaApi.edit(workspaceId as string, params),
    onSuccess: () => invalidateAllFor(qc, workspaceId),
  });
}

export function useInstagramVariantsMutation(workspaceId: string | null) {
  return useMutation({
    mutationFn: (params: { topic: string; count?: number; language?: string }) =>
      generatedMediaApi.instagramVariants(workspaceId as string, params),
  });
}
