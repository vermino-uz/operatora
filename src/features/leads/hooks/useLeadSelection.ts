"use client";

import { useMemo, useState } from "react";

/**
 * Row multi-select — genuinely local UI state per this project's
 * state-separation rule (not TanStack Query/server state), shared between
 * the Active tab's Kanban and List views (one selection set survives a
 * view-mode toggle, matching how a user would expect "select 3 leads, then
 * switch to List to bulk-archive them" to behave) and instantiated
 * separately per other tab that grows its own row-selection UI (Archived).
 */
export function useLeadSelection() {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  return useMemo(
    () => ({
      selected,
      selectedIds: Array.from(selected),
      count: selected.size,
      isSelected: (id: string) => selected.has(id),
      toggle: (id: string) =>
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }),
      /** Select-all/none against a specific visible id list (e.g. the
       * current page) — additive, doesn't clear ids selected on another
       * page/column so a multi-page bulk selection survives pagination. */
      toggleAll: (ids: string[]) =>
        setSelected((prev) => {
          const allSelected = ids.length > 0 && ids.every((id) => prev.has(id));
          const next = new Set(prev);
          if (allSelected) {
            ids.forEach((id) => next.delete(id));
          } else {
            ids.forEach((id) => next.add(id));
          }
          return next;
        }),
      clear: () => setSelected(new Set()),
    }),
    [selected],
  );
}

export type LeadSelection = ReturnType<typeof useLeadSelection>;
