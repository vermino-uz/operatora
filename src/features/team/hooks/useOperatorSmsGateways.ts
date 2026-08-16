"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { smsGatewaysApi } from "@/services/api/smsGateways";
import type { UpsertSmsGatewayInput } from "@/features/team/types";

function smsQueryKey(userId: string | null) {
  return ["operator-sms-gateways", userId] as const;
}

export function useOperatorSmsGatewaysQuery(userId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: smsQueryKey(userId),
    queryFn: () => smsGatewaysApi.list(userId as string),
    enabled: enabled && !!userId,
    staleTime: 15_000,
  });
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>, userId: string | null) {
  queryClient.invalidateQueries({ queryKey: smsQueryKey(userId) });
}

export function useCreateSmsGatewayMutation(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertSmsGatewayInput) => {
      if (!userId) throw new Error("No member selected");
      return smsGatewaysApi.create(userId, input);
    },
    onSuccess: () => invalidate(queryClient, userId),
  });
}

export function useUpdateSmsGatewayMutation(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<UpsertSmsGatewayInput> }) => {
      if (!userId) throw new Error("No member selected");
      return smsGatewaysApi.update(userId, id, input);
    },
    onSuccess: () => invalidate(queryClient, userId),
  });
}

export function useDeleteSmsGatewayMutation(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (!userId) throw new Error("No member selected");
      return smsGatewaysApi.remove(userId, id);
    },
    onSuccess: () => invalidate(queryClient, userId),
  });
}
