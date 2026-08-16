"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { billingApi } from "@/services/api/billing";
import { billingFeaturesQueryKey } from "@/features/team/hooks/useBilling";

function invoicesKey(workspaceId: string | null) {
  return ["billing-invoices", workspaceId ?? "none"] as const;
}
function cardsKey(workspaceId: string | null) {
  return ["billing-cards", workspaceId ?? "none"] as const;
}
function balanceKey(workspaceId: string | null) {
  return ["billing-balance", workspaceId ?? "none"] as const;
}

export function useBillingInvoicesQuery(workspaceId: string | null) {
  return useQuery({
    queryKey: invoicesKey(workspaceId),
    queryFn: () => billingApi.listInvoices(workspaceId as string),
    enabled: Boolean(workspaceId),
  });
}

export function useChargeSubscriptionMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { sub_id: string; card_id?: string; payment_method: "card" | "balance"; set_default?: boolean }) => {
      if (!workspaceId) throw new Error("No workspace selected");
      return billingApi.chargeSubscription(workspaceId, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invoicesKey(workspaceId) });
      qc.invalidateQueries({ queryKey: billingFeaturesQueryKey(workspaceId) });
    },
  });
}

export function useDeclineSeatMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (quantity: number) => {
      if (!workspaceId) throw new Error("No workspace selected");
      return billingApi.declineOperatorSeat(workspaceId, quantity);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invoicesKey(workspaceId) });
      qc.invalidateQueries({ queryKey: billingFeaturesQueryKey(workspaceId) });
    },
  });
}

export function useBillingCardsQuery(workspaceId: string | null) {
  return useQuery({
    queryKey: cardsKey(workspaceId),
    queryFn: () => billingApi.listCards(workspaceId as string),
    enabled: Boolean(workspaceId),
    staleTime: 30_000,
  });
}

export function useStartAddCardMutation(workspaceId: string | null) {
  return useMutation({
    mutationFn: (body: { card_number: string; expire_date: string; phone_number?: string }) => {
      if (!workspaceId) throw new Error("No workspace selected");
      return billingApi.startAddCard(workspaceId, body);
    },
  });
}

export function useConfirmAddCardMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { card_id: string; otp: string; card_name?: string }) => {
      if (!workspaceId) throw new Error("No workspace selected");
      return billingApi.confirmAddCard(workspaceId, body);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: cardsKey(workspaceId) }),
  });
}

export function useDeleteCardMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cardId: string) => {
      if (!workspaceId) throw new Error("No workspace selected");
      return billingApi.deleteCard(workspaceId, cardId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: cardsKey(workspaceId) }),
  });
}

export function useSetDefaultCardMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cardId: string) => {
      if (!workspaceId) throw new Error("No workspace selected");
      return billingApi.setDefaultCard(workspaceId, cardId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: cardsKey(workspaceId) }),
  });
}

export function useWorkspaceBalanceQuery(workspaceId: string | null) {
  return useQuery({
    queryKey: balanceKey(workspaceId),
    queryFn: () => billingApi.getBalance(workspaceId as string),
    enabled: Boolean(workspaceId),
    staleTime: 15_000,
  });
}

export function useTopUpBalanceWithCardMutation(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { amount_uzs: number; card_id: string; set_default?: boolean }) => {
      if (!workspaceId) throw new Error("No workspace selected");
      return billingApi.topUpBalanceWithCard(workspaceId, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: balanceKey(workspaceId) });
      qc.invalidateQueries({ queryKey: billingFeaturesQueryKey(workspaceId) });
    },
  });
}

export function useTopUpBalanceGatewayMutation(workspaceId: string | null) {
  return useMutation({
    mutationFn: (amountUzs: number) => {
      if (!workspaceId) throw new Error("No workspace selected");
      return billingApi.topUpBalanceGateway(workspaceId, amountUzs);
    },
  });
}

const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS = 3 * 60 * 1000;

/** Reconciliation poll for a gateway balance top-up — same pattern as
 * Team Members' `useSeatPurchasePolling`, but watching `balance_uzs`
 * increase past its pre-checkout snapshot instead of a seat count. */
export function useBalanceTopUpPolling(params: {
  workspaceId: string | null;
  active: boolean;
  baselineUzs: number;
  onComplete: () => void;
}) {
  const { workspaceId, active, baselineUzs, onComplete } = params;
  const qc = useQueryClient();
  const [timedOut, setTimedOut] = useState(false);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  const pollKey = active && workspaceId ? `${workspaceId}:${baselineUzs}` : null;
  const [trackedKey, setTrackedKey] = useState<string | null>(null);
  if (pollKey !== trackedKey) {
    setTrackedKey(pollKey);
    if (pollKey) setTimedOut(false);
  }

  useEffect(() => {
    if (!active || !workspaceId) return;
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
        const next = await billingApi.getBalance(workspaceId);
        if (cancelled) return;
        if (next.balance_uzs > baselineUzs) {
          clearInterval(interval);
          qc.invalidateQueries({ queryKey: balanceKey(workspaceId) });
          qc.invalidateQueries({ queryKey: billingFeaturesQueryKey(workspaceId) });
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
  }, [active, workspaceId, baselineUzs, qc]);

  return { timedOut };
}
