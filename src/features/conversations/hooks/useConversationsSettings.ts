"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { autoLeadCreateApi } from "@/services/api/autoLeadCreate";
import { leadsBoardsApi } from "@/services/api/leadsBoards";
import { leadsBoardsQueryKey } from "@/features/leads-boards/hooks/useLeadsBoards";

const AUDIO_CHANNEL = "audio_upload" as const;

function autoLeadCreateQueryKey(workspaceId: string | null) {
  return ["auto-lead-create", workspaceId] as const;
}

export function useAudioLeadBoardSettingQuery(workspaceId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: autoLeadCreateQueryKey(workspaceId),
    queryFn: async () => {
      const rows = await autoLeadCreateApi.list(workspaceId as string);
      return rows.find((r) => r.channel === AUDIO_CHANNEL) ?? null;
    },
    enabled: enabled && Boolean(workspaceId),
  });
}

export function useSaveAudioLeadBoardSettingMutation(workspaceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { pipelineId: string; stageId: string }) =>
      autoLeadCreateApi.upsert({
        workspaceId: workspaceId as string,
        channel: AUDIO_CHANNEL,
        enabled: true,
        pipelineId: args.pipelineId,
        stageId: args.stageId,
      }),
    onSuccess: () => {
      if (workspaceId) queryClient.invalidateQueries({ queryKey: autoLeadCreateQueryKey(workspaceId) });
    },
  });
}

export function useCallAutofillMutation(workspaceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ boardId, enabled }: { boardId: string; enabled: boolean }) =>
      leadsBoardsApi.updateCallAutofill(boardId, enabled),
    onSuccess: () => {
      if (workspaceId) queryClient.invalidateQueries({ queryKey: leadsBoardsQueryKey(workspaceId) });
    },
  });
}
