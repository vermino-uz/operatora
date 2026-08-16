"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { leadsBoardsApi } from "@/services/api/leadsBoards";
import { leadsBoardsQueryKey } from "@/features/leads-boards/hooks/useLeadsBoards";
import type { LeadBoardShareSettings } from "@/features/leads/types";

/** Create/rename/delete a board — invalidates the shared `useLeadsBoardsQuery`
 * list (`features/leads-boards/hooks/useLeadsBoards.ts`, already the single
 * source of truth for board pickers across Google Sheets/Lead Automations/
 * Tasks Settings/this feature's own switcher) rather than a second board-list
 * query. */
export function useCreateBoardMutation(workspaceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => leadsBoardsApi.create(name),
    onSuccess: () => {
      if (workspaceId) queryClient.invalidateQueries({ queryKey: leadsBoardsQueryKey(workspaceId) });
    },
  });
}

export function useRenameBoardMutation(workspaceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ boardId, name }: { boardId: string; name: string }) => leadsBoardsApi.rename(boardId, name),
    onSuccess: () => {
      if (workspaceId) queryClient.invalidateQueries({ queryKey: leadsBoardsQueryKey(workspaceId) });
    },
  });
}

export function useDeleteBoardMutation(workspaceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (boardId: string) => leadsBoardsApi.remove(boardId),
    onSuccess: () => {
      if (workspaceId) queryClient.invalidateQueries({ queryKey: leadsBoardsQueryKey(workspaceId) });
    },
  });
}

function shareQueryKey(boardId: string | null) {
  return ["board-share", boardId] as const;
}

export function useBoardShareQuery(boardId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: shareQueryKey(boardId),
    queryFn: () => leadsBoardsApi.getShare(boardId as string),
    enabled: Boolean(boardId) && enabled,
  });
}

export function useUpdateBoardShareMutation(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { enabled?: boolean; password?: string | null; expiresAt?: string | null }) =>
      leadsBoardsApi.updateShare(boardId, payload),
    onSuccess: (data) => queryClient.setQueryData(shareQueryKey(boardId), data),
  });
}

export function useRotateBoardShareMutation(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => leadsBoardsApi.rotateShare(boardId),
    onSuccess: (data) =>
      queryClient.setQueryData<LeadBoardShareSettings | undefined>(shareQueryKey(boardId), (prev) =>
        prev ? { ...prev, token: data.token } : prev,
      ),
  });
}
