"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@heroui/react";
import { Magnifier as Search } from "@gravity-ui/icons";

import { useDebounce } from "@/hooks/useDebounce";

/** Header search for the leads board. Debounced into `LeadFilters.search`.
 * The input owns what the user is typing. Parent `value` is only copied
 * back when it changes from outside (Clear filters) — syncing on every
 * parent update fights the debounce and makes the text flicker. */
export function LeadsHeaderSearch({ value, onChange }: { value: string; onChange: (search: string) => void }) {
  const [searchInput, setSearchInput] = useState(value);
  const debouncedSearch = useDebounce(searchInput, 350);
  const emitted = useRef(value);

  useEffect(() => {
    if (debouncedSearch === emitted.current) return;
    emitted.current = debouncedSearch;
    onChange(debouncedSearch);
    // Only react to the debounced value — `onChange` would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  useEffect(() => {
    if (value === emitted.current) return;
    emitted.current = value;
    setSearchInput(value);
  }, [value]);

  return (
    <div className="relative min-w-0 flex-1 max-w-md">
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-foreground/40"
        aria-hidden="true"
      />
      <Input
        aria-label="Search leads"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        placeholder="Search name or phone…"
        className="h-9 min-h-9 py-0 pl-8 text-sm"
        fullWidth
      />
    </div>
  );
}
