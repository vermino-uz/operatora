"use client";

import { useMutation } from "@tanstack/react-query";

import { leadsExportApi } from "@/services/api/leadsExportImport";
import type { LeadFilters } from "@/features/leads/types";

/** Real `GET /leads-list/export` call — see `services/api/leadsExportImport.ts`'s
 * doc comment. A mutation, not a query: exporting is a user-triggered
 * one-shot action (download), not cached/re-rendered server state — same
 * reasoning as every other one-shot action mutation in this feature. */
export function useLeadExportMutation() {
  return useMutation({
    mutationFn: (params: { boardId: string; filters?: LeadFilters; selectedColumns?: string[] }) =>
      leadsExportApi.exportCsv(params),
  });
}
