"use client";

import { LayoutColumns, LayoutRows } from "@gravity-ui/icons";

import { IconButton } from "@/components/ui/IconButton";
import type { LeadViewMode } from "@/features/leads/types";

/** Kanban vs. table toggle — only meaningful for the Active tab (see
 * `LeadViewMode`'s doc comment). */
export function LeadViewToggle({ value, onChange }: { value: LeadViewMode; onChange: (mode: LeadViewMode) => void }) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-black/[0.08] p-0.5 dark:border-white/[0.12]">
      <IconButton
        label="Board view"
        tooltip="Board view"
        variant={value === "board" ? "secondary" : "ghost"}
        size="sm"
        onPress={() => onChange("board")}
      >
        <LayoutColumns className="size-4" aria-hidden="true" />
      </IconButton>
      <IconButton
        label="List view"
        tooltip="List view"
        variant={value === "list" ? "secondary" : "ghost"}
        size="sm"
        onPress={() => onChange("list")}
      >
        <LayoutRows className="size-4" aria-hidden="true" />
      </IconButton>
    </div>
  );
}
