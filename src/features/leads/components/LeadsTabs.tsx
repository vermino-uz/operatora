"use client";

import { LEAD_TABS, type LeadTab } from "@/features/leads/types";

/** Active / Sold / Rejected / Archived / Trash as a header switcher, not a
 * full-width tab strip. Same height as the search field and board picker. */
export function LeadsTabs({ value, onChange }: { value: LeadTab; onChange: (tab: LeadTab) => void }) {
  return (
    <div
      role="tablist"
      aria-label="Lead status"
      className="flex h-9 shrink-0 items-center gap-0.5 rounded-field border border-black/[0.08] bg-field p-0.5 dark:border-white/[0.12]"
    >
      {LEAD_TABS.map((tab) => {
        const selected = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={`h-full rounded-[calc(var(--radius-field)-2px)] px-2.5 text-sm leading-none whitespace-nowrap transition-colors ${
              selected
                ? "bg-default font-medium text-foreground shadow-field"
                : "text-foreground/55 hover:bg-default/70 hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
