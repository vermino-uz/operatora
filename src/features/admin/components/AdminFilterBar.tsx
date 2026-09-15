"use client";

import { Input, TextField } from "@heroui/react";
import type { ReactNode } from "react";

/** Thin filter-bar shell shared by every admin list page (search box +
 * arbitrary filter controls as children) — kept generic rather than
 * duplicating the same flex/border wrapper markup per page. */
export function AdminFilterBar({
  searchValue,
  onSearchChange,
  onSearchSubmit,
  searchPlaceholder = "Search…",
  children,
}: {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit?: () => void;
  searchPlaceholder?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-divider bg-background p-3">
      <form
        className="min-w-[220px] flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          onSearchSubmit?.();
        }}
      >
        <TextField aria-label="Search">
          <Input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
          />
        </TextField>
      </form>
      {children}
    </div>
  );
}
