"use client";

import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";

import { archivedLeadsApi, leadsApi, rejectedLeadsApi, soldLeadsApi, type CreateLeadPayload } from "@/services/api/leads";
import { leadQueryKey } from "@/features/leads/hooks/useLeadDetailsQuery";
import { invalidateAllLeadViews } from "@/features/leads/hooks/invalidateAllLeadViews";
import type { LeadBoardData, LeadRow } from "@/features/leads/types";
import type { Paginated } from "@/types/api";

type ColumnLeadsSnapshot = [QueryKey, Paginated<LeadRow> | undefined][];
type BoardSnapshot = [QueryKey, LeadBoardData | undefined][];

/**
 * Move a lead between columns — optimistic cache update + rollback on
 * failure, mirroring the old frontend's `moveLeadMutation` in
 * `LeadBoard.tsx` (same "patch column-leads pages + board counts, restore
 * snapshots on error" shape), adapted to this app's `Paginated<T>`
 * envelope instead of the old ad-hoc `{leads}`/`{columns}` shapes.
 */
export function useMoveLeadMutation(boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ leadId, columnId }: { leadId: string; columnId: string }) =>
      leadsApi.moveLead(leadId, columnId),

    onMutate: async ({ leadId, columnId }) => {
      await queryClient.cancelQueries({ predicate: (q) => q.queryKey[0] === "column-leads" && q.queryKey[1] === boardId });
      await queryClient.cancelQueries({ predicate: (q) => q.queryKey[0] === "lead-board" && q.queryKey[1] === boardId });

      const columnSnapshots: ColumnLeadsSnapshot = queryClient.getQueriesData({
        predicate: (q) => q.queryKey[0] === "column-leads" && q.queryKey[1] === boardId,
      });
      const boardSnapshots: BoardSnapshot = queryClient.getQueriesData({
        predicate: (q) => q.queryKey[0] === "lead-board" && q.queryKey[1] === boardId,
      });

      let movedLead: LeadRow | null = null;
      let sourceColumnId: string | null = null;
      for (const [key, data] of columnSnapshots) {
        const found = data?.items.find((l) => l.id === leadId);
        if (found) {
          movedLead = { ...found, column_id: columnId };
          sourceColumnId = key[2] as string;
          break;
        }
      }

      if (movedLead) {
        for (const [key, data] of columnSnapshots) {
          if (!data) continue;
          const queryColumnId = key[2] as string;
          const queryPage = key[3] as number;
          const withoutMoved = data.items.filter((l) => l.id !== leadId);
          if (queryColumnId === columnId && queryPage === 1) {
            queryClient.setQueryData(key, {
              ...data,
              items: [movedLead as LeadRow, ...withoutMoved].slice(0, data.pageSize),
              total: data.total + (queryColumnId === sourceColumnId ? 0 : 1),
            });
          } else if (queryColumnId === sourceColumnId) {
            queryClient.setQueryData(key, { ...data, items: withoutMoved, total: Math.max(0, data.total - 1) });
          }
        }

        for (const [key, data] of boardSnapshots) {
          if (!data) continue;
          const counts = { ...data.counts };
          if (sourceColumnId) counts[sourceColumnId] = Math.max(0, (counts[sourceColumnId] ?? 0) - 1);
          counts[columnId] = (counts[columnId] ?? 0) + 1;
          queryClient.setQueryData(key, { ...data, counts });
        }
      }

      return { columnSnapshots, boardSnapshots };
    },

    onError: (_err, _vars, context) => {
      context?.columnSnapshots.forEach(([key, data]) => queryClient.setQueryData(key, data));
      context?.boardSnapshots.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },

    onSettled: () => {
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "column-leads" && q.queryKey[1] === boardId });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "lead-board" && q.queryKey[1] === boardId });
    },
  });
}

/** Reassign (or unassign, `operatorId: null`) the currently open lead —
 * invalidates its own detail query plus the board's column-leads pages
 * (the card shows the assignee) rather than an optimistic patch, since the
 * assignee's display name isn't known client-side until the backend
 * resolves `operatorId` (see `leadsApi.assignOperator`'s doc comment). */
export function useAssignOperatorMutation(boardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ leadId, operatorId }: { leadId: string; operatorId: string | null }) =>
      leadsApi.assignOperator(leadId, operatorId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: leadQueryKey(variables.leadId) });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "column-leads" && q.queryKey[1] === boardId });
    },
  });
}

/** `POST /add-lead` — invalidates the full board-scoped view set
 * (`invalidateAllLeadViews`) since a newly created lead affects the board's
 * counts, the Active tab's List view, and potentially Google Sheets
 * auto-export triggers server-side (fire-and-forget, not this frontend's
 * concern) — no optimistic patch, the server resolves `display_order`/
 * `assigned_operator_id`/duplicate-phone checks that can't be predicted
 * client-side. */
export function useCreateLeadMutation(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateLeadPayload) => leadsApi.createLead(payload),
    onSuccess: () => invalidateAllLeadViews(queryClient, boardId),
  });
}

/** `PATCH /sold-leads-list/:id/mark-sold` — invalidates the full
 * board-scoped view set: a sold lead disappears from the Active board/list
 * and appears on the Sold tab simultaneously. */
export function useMarkSoldMutation(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, note }: { leadId: string; note?: string }) => soldLeadsApi.markSold(leadId, note),
    onSuccess: () => invalidateAllLeadViews(queryClient, boardId),
  });
}

/** `PATCH /rejected-leads-list/:id/mark-rejected` — same full-set
 * invalidation reasoning as `useMarkSoldMutation` above, for the Rejected
 * tab instead. */
export function useMarkRejectedMutation(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, reason }: { leadId: string; reason: string }) => rejectedLeadsApi.markRejected(leadId, reason),
    onSuccess: () => invalidateAllLeadViews(queryClient, boardId),
  });
}

/**
 * Row-selection bulk actions (Phase 2c-3) — `selectedLeads` sent as the
 * real multi-id array every `right-board-controller`/`archived-leads-list`
 * endpoint already accepts (confirmed directly, not assumed). No
 * optimistic patch (unlike the single-lead drag-and-drop move) since a
 * bulk action can span multiple columns/pages at once — full-set
 * invalidation via `invalidateAllLeadViews`, same as every other
 * cross-view-affecting mutation in this file.
 */
export function useBulkMoveColumnMutation(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ leadIds, columnId }: { leadIds: string[]; columnId: string }) => leadsApi.moveLeadsBulk(leadIds, columnId),
    onSuccess: () => invalidateAllLeadViews(queryClient, boardId),
  });
}

export function useBulkAssignOperatorMutation(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ leadIds, operatorId }: { leadIds: string[]; operatorId: string | null }) =>
      leadsApi.assignOperatorBulk(leadIds, operatorId),
    onSuccess: () => invalidateAllLeadViews(queryClient, boardId),
  });
}

/** `PATCH /archived-leads-list/archive-multiple` — id-list archive for an
 * explicit row selection (distinct from `useFilteredBulkExecuteMutation`'s
 * filter-scoped `archive` action). */
export function useBulkArchiveLeadsMutation(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (leadIds: string[]) => archivedLeadsApi.archiveMultiple(leadIds),
    onSuccess: () => invalidateAllLeadViews(queryClient, boardId),
  });
}

/** `POST /right-board-controller/delete-leads` — soft-delete (into Trash)
 * an explicit row selection. */
export function useBulkDeleteLeadsMutation(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (leadIds: string[]) => leadsApi.deleteLeadsBulk(leadIds),
    onSuccess: () => invalidateAllLeadViews(queryClient, boardId),
  });
}
