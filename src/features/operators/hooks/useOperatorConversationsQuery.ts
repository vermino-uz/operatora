import { useQuery } from "@tanstack/react-query";
import { operatorsApi } from "@/services/api/operators";

/** `GET /operators-page/conversations` for the selected date range — the
 * old frontend's `capped at 5000` limit is preserved as-is (a real
 * backend cap, not a client choice). Keyed on the range so changing
 * dates is a normal query-key change (dedupe/cancel-on-change handled by
 * TanStack Query, not manual AbortController wiring). */
export function useOperatorConversationsQuery(range: { from?: string; to?: string }) {
  return useQuery({
    queryKey: ["operators-page", "conversations", range.from ?? null, range.to ?? null],
    queryFn: () => operatorsApi.conversations({ from: range.from, to: range.to, limit: 5000 }),
    staleTime: 15_000,
  });
}
