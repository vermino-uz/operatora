"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { gsmApi } from "@/services/api/gsm";
import type { UpsertGsmLineInput } from "@/features/team/types";

function gsmQueryKey(userId: string | null) {
  return ["operator-gsm-lines", userId] as const;
}

export function useOperatorGsmQuery(userId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: gsmQueryKey(userId),
    queryFn: () => gsmApi.list(userId as string),
    enabled: enabled && !!userId,
    staleTime: 15_000,
  });
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>, userId: string | null) {
  queryClient.invalidateQueries({ queryKey: gsmQueryKey(userId) });
  // Keeps the "GSM Lines" settings section's per-member counts in sync — it
  // reads the same lines via a separate, workspace-scoped roster endpoint.
  // No workspaceId is available here (GSM is user_id-scoped only), so match
  // by key prefix instead — only the caller's current workspace roster is
  // ever mounted at once.
  queryClient.invalidateQueries({ queryKey: ["workspace-telephony-gsm"] });
}

export function useCreateGsmLineMutation(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertGsmLineInput) => {
      if (!userId) throw new Error("No member selected");
      return gsmApi.create(userId, input);
    },
    onSuccess: () => invalidate(queryClient, userId),
  });
}

export function useUpdateGsmLineMutation(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<UpsertGsmLineInput> }) => {
      if (!userId) throw new Error("No member selected");
      return gsmApi.update(userId, id, input);
    },
    onSuccess: () => invalidate(queryClient, userId),
  });
}

export function useDeleteGsmLineMutation(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (!userId) throw new Error("No member selected");
      return gsmApi.remove(userId, id);
    },
    onSuccess: () => invalidate(queryClient, userId),
  });
}
