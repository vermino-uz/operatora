import { useMutation, useQueryClient } from "@tanstack/react-query";

import { teamApi } from "@/services/api/team";
import type { CreateOperatorInput, UpdateOperatorInput } from "@/features/team/types";

function invalidateTeam(queryClient: ReturnType<typeof useQueryClient>, workspaceId: string | null) {
  queryClient.invalidateQueries({ queryKey: ["workspace-operators", workspaceId] });
}

export function useInviteMemberMutation(workspaceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOperatorInput) => {
      if (!workspaceId) throw new Error("No workspace selected");
      return teamApi.invite(workspaceId, input);
    },
    onSuccess: () => invalidateTeam(queryClient, workspaceId),
  });
}

export function useUpdateMemberMutation(workspaceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, input }: { userId: string; input: UpdateOperatorInput }) => {
      if (!workspaceId) throw new Error("No workspace selected");
      return teamApi.update(workspaceId, userId, input);
    },
    onSuccess: () => invalidateTeam(queryClient, workspaceId),
  });
}

export function useRemoveMemberMutation(workspaceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => {
      if (!workspaceId) throw new Error("No workspace selected");
      return teamApi.remove(workspaceId, userId);
    },
    onSuccess: () => invalidateTeam(queryClient, workspaceId),
  });
}
