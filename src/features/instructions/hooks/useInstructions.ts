"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { instructionsApi, quickLinksApi } from "@/services/api/instructions";
import type { InstructionInput, InstructionRow, QuickLinkInput } from "@/features/instructions/types";

function instructionsKey(workspaceId: string | null) {
  return ["instructions", workspaceId ?? "none"] as const;
}

export function useInstructionsQuery(workspaceId: string | null) {
  return useQuery({
    queryKey: instructionsKey(workspaceId),
    queryFn: () => instructionsApi.list(),
    enabled: Boolean(workspaceId),
  });
}

export function useCreateInstructionMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, displayOrder }: { input: InstructionInput; displayOrder: number }) =>
      instructionsApi.create(input, displayOrder),
    onSuccess: () => qc.invalidateQueries({ queryKey: instructionsKey(workspaceId) }),
  });
}

export function useUpdateInstructionMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: InstructionInput }) => instructionsApi.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: instructionsKey(workspaceId) }),
  });
}

export function useDeleteInstructionMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => instructionsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: instructionsKey(workspaceId) }),
  });
}

export function useReorderInstructionsMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rows: { id: string; display_order: number }[]) => instructionsApi.reorder(rows),
    onSuccess: () => qc.invalidateQueries({ queryKey: instructionsKey(workspaceId) }),
  });
}

function quickLinksKey(workspaceId: string | null) {
  return ["quick-links", workspaceId ?? "none"] as const;
}

export function useQuickLinksQuery(workspaceId: string | null) {
  return useQuery({
    queryKey: quickLinksKey(workspaceId),
    queryFn: () => quickLinksApi.list(),
    enabled: Boolean(workspaceId),
  });
}

export function useCreateQuickLinkMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, displayOrder }: { input: QuickLinkInput; displayOrder: number }) =>
      quickLinksApi.create(input, displayOrder),
    onSuccess: () => qc.invalidateQueries({ queryKey: quickLinksKey(workspaceId) }),
  });
}

export function useDeleteQuickLinkMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => quickLinksApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: quickLinksKey(workspaceId) }),
  });
}

export type { InstructionRow };
