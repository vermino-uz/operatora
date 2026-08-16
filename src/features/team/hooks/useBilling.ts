"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { billingApi } from "@/services/api/billing";

export function billingFeaturesQueryKey(workspaceId: string | null) {
  return ["billing-features", workspaceId ?? "none"] as const;
}

export function useBillingFeaturesQuery(workspaceId: string | null) {
  return useQuery({
    queryKey: billingFeaturesQueryKey(workspaceId),
    queryFn: () => billingApi.me(workspaceId as string),
    enabled: !!workspaceId,
    staleTime: 60_000,
  });
}

export function useRentSeatMutation(workspaceId: string | null) {
  return useMutation({
    mutationFn: (quantity: number) => {
      if (!workspaceId) throw new Error("No workspace selected");
      return billingApi.rentOperatorSeat(workspaceId, quantity);
    },
  });
}

const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Reconciliation poll for a pending seat purchase — mirrors the old
 * frontend's `rentSeatMutation.onSuccess` interval exactly: poll
 * `GET /billing/me` every 3s, stop after 10 minutes (Paylov invoices can
 * take a while to settle), stop immediately on unmount or when `active`
 * turns false, and treat "extra_operator_seats has reached the target" as
 * completion. No guessed backend contract here — same fields as
 * `useBillingFeaturesQuery` already validates.
 */
export function useSeatPurchasePolling(params: {
  workspaceId: string | null;
  targetExtraSeats: number | null;
  active: boolean;
  onComplete: () => void;
}) {
  const { workspaceId, targetExtraSeats, active, onComplete } = params;
  const queryClient = useQueryClient();
  const [timedOut, setTimedOut] = useState(false);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  // Render-time "adjust state on prop change" (not a set-state-in-effect) —
  // resets the timeout flag whenever a new poll target starts.
  const pollKey = active && workspaceId && targetExtraSeats != null ? `${workspaceId}:${targetExtraSeats}` : null;
  const [trackedPollKey, setTrackedPollKey] = useState<string | null>(null);
  if (pollKey !== trackedPollKey) {
    setTrackedPollKey(pollKey);
    if (pollKey) setTimedOut(false);
  }

  useEffect(() => {
    if (!active || !workspaceId || targetExtraSeats == null) return;

    const startedAt = Date.now();
    let cancelled = false;

    const interval = setInterval(async () => {
      if (cancelled) return;
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        clearInterval(interval);
        if (!cancelled) setTimedOut(true);
        return;
      }
      try {
        const next = await billingApi.me(workspaceId);
        if (cancelled) return;
        if (next.extra_operator_seats >= targetExtraSeats) {
          clearInterval(interval);
          queryClient.setQueryData(billingFeaturesQueryKey(workspaceId), next);
          queryClient.invalidateQueries({ queryKey: billingFeaturesQueryKey(workspaceId) });
          onCompleteRef.current();
        }
      } catch {
        /* transient — keep polling until timeout */
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [active, workspaceId, targetExtraSeats, queryClient]);

  return { timedOut };
}
