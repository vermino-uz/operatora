"use client";

import { Tabs } from "@heroui/react";

import { LEAD_TABS, type LeadTab } from "@/features/leads/types";

/** Active/Sold/Rejected/Archived/Trash — fixed order, no admin-configurable
 * reordering/visibility yet (the old frontend's `leads-tab-config` — see
 * PROGRESS.md's Leads — tabs & list view entry for why that's deferred). */
export function LeadsTabs({ value, onChange }: { value: LeadTab; onChange: (tab: LeadTab) => void }) {
  return (
    <Tabs selectedKey={value} onSelectionChange={(key) => onChange(key as LeadTab)}>
      <Tabs.List className="px-4">
        {LEAD_TABS.map((tab) => (
          <Tabs.Tab key={tab.id} id={tab.id}>
            {tab.label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
    </Tabs>
  );
}
