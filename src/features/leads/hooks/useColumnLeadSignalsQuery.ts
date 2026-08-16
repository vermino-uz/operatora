"use client";

import { useQuery } from "@tanstack/react-query";

import { dbProxyQuery } from "@/services/api/db-proxy";

export interface ColumnLeadSignal {
  lead_id: string;
  buying_intent_score: number | null;
}

/** Batched `buying_intent_score` lookup for a page of visible cards, via the
 * `lead_signals` db-proxy table (`table-registry.ts`: `{table:
 * 'lead_signals', scope: 'workspace', writeRoles: ADMIN_ROLES}` — no
 * `readRoles` set, so any workspace member can read; its own doc comment
 * there says exactly this: "frontend faqat o'qiydi (lead kartalarida intent
 * ko'rsatish uchun)" — read-only, for showing intent on lead cards). One
 * request for the whole visible page (`lead_id IN (...)`), not one request
 * per card — the sort-by-AI-score toggle only fires this when explicitly
 * turned on (see `KanbanColumn`), so it never floods the network on a
 * normal board render. */
export function useColumnLeadSignalsQuery(leadIds: string[], enabled: boolean) {
  const sortedIds = [...leadIds].sort();
  return useQuery({
    queryKey: ["column-lead-signals", sortedIds],
    queryFn: () =>
      dbProxyQuery<ColumnLeadSignal[]>("lead_signals", {
        method: "select",
        select: "lead_id,buying_intent_score",
        filters: [{ column: "lead_id", op: "in", value: sortedIds }],
      }),
    enabled: enabled && sortedIds.length > 0,
    staleTime: 30_000,
  });
}
