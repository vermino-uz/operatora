"use client";

import { useQuery } from "@tanstack/react-query";

import { leadsApi } from "@/services/api/leads";

/** `GET /add-lead/columns?boardId=` — the Create Lead dialog's own column
 * picker (excludes the locked Sold/Rejected marker columns server-side, see
 * `leadsApi.getAddLeadColumns`'s doc comment), separate from
 * `useLeadBoardQuery`'s `lead-board` cache key. */
export function useAddLeadColumnsQuery(boardId: string | null) {
  return useQuery({
    queryKey: ["add-lead-columns", boardId],
    queryFn: () => leadsApi.getAddLeadColumns(boardId as string),
    enabled: Boolean(boardId),
  });
}
