import type { QueryClient } from "@tanstack/react-query";

/** Every board-scoped lead-list query key this feature registers — a
 * restore/delete/permanent-delete on any one tab can move a lead into or
 * out of any of the others (e.g. restoring a Sold lead makes it reappear on
 * the Active board), so every action invalidates the full set rather than
 * just its own tab, mirroring the old frontend's own `invalidateLeadViews`/
 * `invalidateLeadViewsAfterSoldChange` helpers. */
const BOARD_SCOPED_KEYS = ["lead-board", "column-leads", "leads-list", "sold-leads", "rejected-leads", "archived-leads"];

export function invalidateAllLeadViews(queryClient: QueryClient, boardId: string | null): void {
  queryClient.invalidateQueries({
    predicate: (q) => BOARD_SCOPED_KEYS.includes(String(q.queryKey[0])) && (!boardId || q.queryKey[1] === boardId),
  });
  queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "leads-trash" });
}
