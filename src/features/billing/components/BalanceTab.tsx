"use client";

import { useState } from "react";
import { Button, Input, Label, ListBox, Select, TextField } from "@heroui/react";
import { CircleRuble } from "@gravity-ui/icons";

import { ApiError } from "@/types/api";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { formatSom, PAYME_PAYMENTS_ENABLED } from "@/features/billing/types";
import {
  useBalanceTopUpPolling,
  useBillingCardsQuery,
  useTopUpBalanceGatewayMutation,
  useTopUpBalanceWithCardMutation,
  useWorkspaceBalanceQuery,
} from "@/features/billing/hooks/useBillingSection";

const PRESET_AMOUNTS = [50_000, 100_000, 200_000, 500_000];

function topUpErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return "Only a workspace admin can top up the balance.";
    if (error.isValidationError) return error.message;
    return error.message;
  }
  return "Top-up failed. Please try again.";
}

export function BalanceTab({ workspaceId }: { workspaceId: string }) {
  const balanceQuery = useWorkspaceBalanceQuery(workspaceId);
  const cardsQuery = useBillingCardsQuery(workspaceId);
  const topUpCard = useTopUpBalanceWithCardMutation(workspaceId);
  const topUpGateway = useTopUpBalanceGatewayMutation(workspaceId);

  const [amount, setAmount] = useState("100000");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [waitingForGateway, setWaitingForGateway] = useState(false);
  const [baselineUzs, setBaselineUzs] = useState(0);
  const [popupBlocked, setPopupBlocked] = useState<string | null>(null);

  const { timedOut } = useBalanceTopUpPolling({
    workspaceId,
    active: waitingForGateway,
    baselineUzs,
    onComplete: () => setWaitingForGateway(false),
  });

  if (balanceQuery.isLoading) return <LoadingState label="Loading balance…" className="py-12" />;
  if (balanceQuery.isError) return <ErrorState error={balanceQuery.error} onRetry={() => balanceQuery.refetch()} className="py-12" />;

  const balance = balanceQuery.data?.balance_uzs ?? 0;
  const cards = cardsQuery.data ?? [];
  const parsedAmount = Math.floor(Number(amount.replace(/\D/g, "")) || 0);

  async function payWithCard() {
    if (topUpCard.isPending) return; // guard double-submit, money-touching
    if (parsedAmount < 500) {
      setError("Minimum top-up is 500 so'm.");
      return;
    }
    const cardId = selectedCardId ?? cards.find((c) => c.is_default)?.id ?? cards[0]?.id;
    if (!cardId) {
      setError("Add a payment card first, under the Payment cards tab.");
      return;
    }
    setError(null);
    try {
      await topUpCard.mutateAsync({ amount_uzs: parsedAmount, card_id: cardId });
    } catch (err) {
      setError(topUpErrorMessage(err));
    }
  }

  async function payWithGateway() {
    if (topUpGateway.isPending) return;
    if (parsedAmount < 500) {
      setError("Minimum top-up is 500 so'm.");
      return;
    }
    setError(null);
    setPopupBlocked(null);
    try {
      const session = await topUpGateway.mutateAsync(parsedAmount);
      const url = (PAYME_PAYMENTS_ENABLED && session.payme_url) || session.click_url || session.paylov_url || session.payment_url;
      if (!url) {
        setError("No payment provider is currently available. Please try again shortly.");
        return;
      }
      setBaselineUzs(balance);
      setWaitingForGateway(true);
      const popup = window.open(url, "operatora-balance-topup", "popup=yes,width=500,height=720");
      if (!popup) setPopupBlocked("checkout");
    } catch (err) {
      setError(topUpErrorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-black/[0.08] p-5 dark:border-white/[0.12]">
        <div className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-wide text-foreground/50 uppercase">
          <CircleRuble className="size-3.5" aria-hidden="true" />
          Prepaid balance
        </div>
        <p className="text-2xl font-bold tabular-nums">{formatSom(balance)}</p>
        <p className="mt-1 text-xs text-foreground/50">Used automatically for renewals and top-ups when selected as the payment method.</p>
      </div>

      <div className="space-y-3 rounded-xl border border-black/[0.08] p-5 dark:border-white/[0.12]">
        <p className="text-sm font-semibold">Top up</p>
        <div className="flex flex-wrap gap-2">
          {PRESET_AMOUNTS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount(String(preset))}
              className={`h-8 rounded-lg border px-3 text-xs font-medium transition-colors ${
                Number(amount) === preset ? "border-primary bg-primary/10 text-primary" : "border-black/[0.08] text-foreground/60 hover:bg-black/[0.02] dark:border-white/[0.12]"
              }`}
            >
              {formatSom(preset)}
            </button>
          ))}
        </div>
        <TextField>
          <Label>Custom amount (so&apos;m)</Label>
          <Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} placeholder="100000" />
        </TextField>

        {cards.length > 1 ? (
          <Select
            aria-label="Card to charge"
            value={selectedCardId ?? cards.find((c) => c.is_default)?.id ?? cards[0]?.id}
            onChange={(key) => typeof key === "string" && setSelectedCardId(key)}
          >
            <Label>Pay with card</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox items={cards.map((c) => ({ id: c.id, label: c.card_name || c.masked_pan || "Card" }))}>
                {(opt) => (
                  <ListBox.Item id={opt.id} textValue={opt.label}>
                    {opt.label}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                )}
              </ListBox>
            </Select.Popover>
          </Select>
        ) : null}

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="flex-1" isDisabled={topUpCard.isPending || cards.length === 0} onPress={() => void payWithCard()}>
            {topUpCard.isPending ? "Charging…" : cards.length === 0 ? "Add a card first" : "Pay with saved card"}
          </Button>
          <Button variant="secondary" className="flex-1" isDisabled={topUpGateway.isPending} onPress={() => void payWithGateway()}>
            {topUpGateway.isPending ? "Preparing…" : "Click / Paylov"}
          </Button>
        </div>

        {popupBlocked ? <p className="text-sm text-danger">Your browser blocked the checkout popup. Allow popups for this site and try again.</p> : null}
        {waitingForGateway ? (
          timedOut ? (
            <p className="text-sm text-warning">We haven&apos;t confirmed the payment yet. If you completed checkout, your balance will update shortly.</p>
          ) : (
            <p className="text-xs text-foreground/50">Waiting for payment confirmation…</p>
          )
        ) : null}
      </div>
    </div>
  );
}
