"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { columnsApi, type CreateColumnPayload, type UpdateColumnPayload } from "@/services/api/leadsColumns";

/** Column list for the management dialog — separate query key from
 * `lead-board` (the rendering query, which excludes hidden columns and has
 * no `lead_limit`/`special_stage_kind` consumer today) so invalidating one
 * doesn't over-invalidate the other. Every mutation below invalidates both:
 * this list (so the dialog reflects its own change immediately) and
 * `lead-board` (so the Kanban board's columns/WIP badges pick it up too). */
function columnsQueryKey(boardId: string | null) {
  return ["board-columns-manage", boardId] as const;
}

export function useBoardColumnsManageQuery(boardId: string | null) {
  return useQuery({
    queryKey: columnsQueryKey(boardId),
    queryFn: () => columnsApi.list(boardId as string),
    enabled: Boolean(boardId),
  });
}

function invalidateColumnQueries(queryClient: ReturnType<typeof useQueryClient>, boardId: string) {
  queryClient.invalidateQueries({ queryKey: columnsQueryKey(boardId) });
  queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "lead-board" && q.queryKey[1] === boardId });
}

export function useCreateColumnMutation(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<CreateColumnPayload, "board_id">) => columnsApi.create({ ...payload, board_id: boardId }),
    onSuccess: () => invalidateColumnQueries(queryClient, boardId),
  });
}

export function useUpdateColumnMutation(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ columnId, payload }: { columnId: string; payload: UpdateColumnPayload }) =>
      columnsApi.update(columnId, payload),
    onSuccess: () => invalidateColumnQueries(queryClient, boardId),
  });
}

export function useDeleteColumnMutation(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (columnId: string) => columnsApi.remove(columnId),
    onSuccess: () => invalidateColumnQueries(queryClient, boardId),
  });
}

export function useReorderColumnMutation(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ columnId, direction }: { columnId: string; direction: "up" | "down" }) =>
      columnsApi.reorder(boardId, columnId, direction),
    onSuccess: () => invalidateColumnQueries(queryClient, boardId),
  });
}
