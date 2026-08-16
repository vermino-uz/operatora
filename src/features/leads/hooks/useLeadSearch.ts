"use client";

import { useQuery } from "@tanstack/react-query";

import { leadSearchApi } from "@/services/api/leadSearch";

/** `relation` field type's search box (Phase 2c-6) — debounce is the
 * caller's responsibility (see `RelationFieldInput`, which reuses this
 * app's existing `useDebounce` hook, same pattern as `ConversationFilters`'
 * search box). */
export function useLeadSearchQuery(query: string, enabled: boolean) {
  return useQuery({
    queryKey: ["lead-search", query],
    queryFn: () => leadSearchApi.search(query),
    enabled,
    staleTime: 10_000,
  });
}

/** Resolve specific lead ids to display names (relation value chips) /
 * `age`+`custom_fields` (rollup aggregation source). */
export function useLeadsByIdsQuery(ids: string[]) {
  const key = [...ids].sort().join(",");
  return useQuery({
    queryKey: ["lead-search-by-ids", key],
    queryFn: () => leadSearchApi.byIds(ids),
    enabled: ids.length > 0,
    staleTime: 30_000,
  });
}
