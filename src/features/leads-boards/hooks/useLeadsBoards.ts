"use client";

import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";

import { leadsBoardsApi } from "@/services/api/leadsBoards";

/** Exported (Phase 2c-5) so board-management mutations (create/rename/
 * delete, `features/leads/hooks/useBoardManagement.ts`) can invalidate this
 * exact query key without duplicating/hardcoding it at each call site. */
export function leadsBoardsQueryKey(workspaceId: string | null) {
  return ["leads-boards", workspaceId] as const;
}

export function useLeadsBoardsQuery(workspaceId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: leadsBoardsQueryKey(workspaceId),
    queryFn: () => leadsBoardsApi.list(workspaceId as string),
    enabled: enabled && Boolean(workspaceId),
    staleTime: 30_000,
  });
}

export function useLeadsBoardColumnsQuery(boardId: string | null) {
  return useQuery({
    queryKey: ["leads-board-columns", boardId],
    queryFn: () => leadsBoardsApi.columns(boardId as string),
    enabled: Boolean(boardId),
    staleTime: 30_000,
  });
}

export interface LeadsColumnWithBoard {
  id: string;
  name: string;
  board_id: string;
  board_name: string;
}

/**
 * All columns across every board in the workspace, flattened with their
 * owning board's id/name attached — used by workspace-wide (not
 * per-board) surfaces like the Lead Automations and Tasks settings
 * sections' column pickers, which the old frontend built by querying
 * `leads_columns` directly rather than per-board.
 */
export function useAllLeadsBoardColumnsQuery(workspaceId: string | null) {
  const boardsQuery = useLeadsBoardsQuery(workspaceId, true);
  const boards = useMemo(() => boardsQuery.data ?? [], [boardsQuery.data]);

  const columnQueries = useQueries({
    queries: boards.map((board) => ({
      queryKey: ["leads-board-columns", board.id],
      queryFn: () => leadsBoardsApi.columns(board.id),
      staleTime: 30_000,
      enabled: Boolean(workspaceId),
    })),
  });

  const isLoading = boardsQuery.isLoading || columnQueries.some((q) => q.isLoading);
  const isError = boardsQuery.isError || columnQueries.some((q) => q.isError);

  const columns = useMemo<LeadsColumnWithBoard[]>(() => {
    if (!boards.length) return [];
    return boards.flatMap((board, idx) => {
      const cols = columnQueries[idx]?.data ?? [];
      return cols.map((c) => ({ id: c.id, name: c.name, board_id: board.id, board_name: board.name }));
    });
  }, [boards, columnQueries]);

  return { boards, columns, isLoading, isError };
}
