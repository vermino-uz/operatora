import { create } from "zustand";
import { persist } from "zustand/middleware";

import { APP_SITEMAP, type TopLevelNavKey } from "@/constants/sitemap";

const DEFAULT_NAV_ORDER: TopLevelNavKey[] = APP_SITEMAP.topLevel.map((item) => item.key);

interface UiState {
  /** User's custom drag-to-reorder order for the sidebar's top-level nav
   * items — a full list of keys, persisted (a pure UI preference, not
   * sensitive). */
  navOrder: TopLevelNavKey[];
  /** Move `draggedKeys` to just before/after `targetKey` in `navOrder`. */
  reorderNav: (
    draggedKeys: TopLevelNavKey[],
    targetKey: TopLevelNavKey,
    position: "before" | "after",
  ) => void;
}

/** Cross-page UI-shell state — intentionally small, never mirrors server
 * data. Persisted so the custom nav order survives reloads. */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      navOrder: DEFAULT_NAV_ORDER,
      reorderNav: (draggedKeys, targetKey, position) =>
        set((s) => {
          const withoutDragged = s.navOrder.filter((k) => !draggedKeys.includes(k));
          const targetIndex = withoutDragged.indexOf(targetKey);
          const insertAt = position === "after" ? targetIndex + 1 : targetIndex;
          return {
            navOrder: [
              ...withoutDragged.slice(0, insertAt),
              ...draggedKeys,
              ...withoutDragged.slice(insertAt),
            ],
          };
        }),
    }),
    { name: "operatora-ui-store" },
  ),
);
