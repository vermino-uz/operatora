"use client";

import { useEffect, useState } from "react";

/** Debounces a fast-changing value (e.g. search input) so it only becomes a
 * new TanStack Query key ~`delayMs` after the user stops typing — the
 * primary input-layer flood-prevention mechanism (ARCHITECTURE.md). */
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
