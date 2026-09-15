"use client";

import { useState } from "react";
import { Button, Input, Label, TextField } from "@heroui/react";
import { CreditCard, Plus } from "@gravity-ui/icons";

import { ApiError } from "@/types/api";
import { LoadingState } from "@/components/shared/LoadingState";
import { formatSom } from "@/features/billing/types";
import {
  useBillingCardsQuery,
  useChargeSubscriptionMutation,
  useConfirmAddCardMutation,
  useStartAddCardMutation,
  useWorkspaceBalanceQuery,
} from "@/features/billing/hooks/useBillingSection";

function cardErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isValidationError) return error.message;
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

function formatCardInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}
function formatExpiryInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length <= 2 ? digits : `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

type Step = "select" | "add" | "otp";

/**
 * Card payment method for `/checkout` — real end-to-end flow, all against
 * confirmed `billing.controller.ts` endpoints already wired in this app's
 * own Settings → Billing → Payment cards tab (`PaymentCardsTab.tsx`, same
 * hooks reused here): list saved cards, add + OTP-confirm a new one, then
 * `POST /billing/subscriptions/charge` against the pending order created by
 * `CheckoutPageContent`.
 */
export function CheckoutCardPanel({
  workspaceId,
  subId,
  amountUzs,
  onPaid,
  onError,
}: {
  workspaceId: string;
  subId: string;
  amountUzs: number;
  onPaid: () => void;
  onError: (message: string) => void;
}) {
  const cardsQuery = useBillingCardsQuery(workspaceId);
  const balanceQuery = useWorkspaceBalanceQuery(workspaceId);
  const startAdd = useStartAddCardMutation(workspaceId);
  const confirmAdd = useConfirmAddCardMutation(workspaceId);
  const charge = useChargeSubscriptionMutation(workspaceId);

  const [step, setStep] = useState<Step>("select");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cardName, setCardName] = useState("");
  const [otp, setOtp] = useState("");
  const [pendingCardId, setPendingCardId] = useState<string | null>(null);
  const [otpPhone, setOtpPhone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cards = cardsQuery.data ?? [];
  // Derived default selection (no effect needed): once cards load, default
  // to the workspace's default card, or the first one, until the user
  // explicitly picks a different one.
  const effectiveSelectedCardId = selectedCardId ?? cards.find((c) => c.is_default)?.id ?? cards[0]?.id ?? null;

  async function submitStartAdd() {
    if (startAdd.isPending) return;
    const digits = cardNumber.replace(/\D/g, "");
    if (digits.length !== 16 || expiry.replace(/\D/g, "").length !== 4) {
      setError("Enter a valid 16-digit card number and MM/YY expiry.");
      return;
    }
    setError(null);
    try {
      const res = await startAdd.mutateAsync({ card_number: digits, expire_date: expiry });
      setPendingCardId(res.card_id);
      setOtpPhone(res.otp_sent_phone);
      setStep("otp");
    } catch (err) {
      setError(cardErrorMessage(err));
    }
  }

  async function submitConfirm() {
    if (confirmAdd.isPending) return;
    if (!pendingCardId || otp.trim().length < 4) {
      setError("Enter the OTP code sent to your phone.");
      return;
    }
    setError(null);
    try {
      const saved = await confirmAdd.mutateAsync({
        card_id: pendingCardId,
        otp: otp.trim(),
        card_name: cardName.trim() || undefined,
      });
      setSelectedCardId(saved.id);
      setPendingCardId(null);
      setOtp("");
      setCardNumber("");
      setExpiry("");
      setStep("select");
    } catch (err) {
      setError(cardErrorMessage(err));
    }
  }

  async function pay(method: "card" | "balance") {
    if (charge.isPending) return; // guard double-submit, money-touching mutation
    if (method === "card" && !effectiveSelectedCardId) {
      setError("Select a card or add a new one.");
      return;
    }
    if (method === "balance" && (balanceQuery.data?.balance_uzs ?? 0) < amountUzs) {
      setError("Not enough workspace balance for this payment.");
      return;
    }
    setError(null);
    try {
      await charge.mutateAsync({
        sub_id: subId,
        card_id: method === "card" ? (effectiveSelectedCardId ?? undefined) : undefined,
        payment_method: method,
        set_default: method === "card",
      });
      onPaid();
    } catch (err) {
      onError(cardErrorMessage(err));
    }
  }

  if (cardsQuery.isLoading) return <LoadingState label="Loading saved cards…" />;

  if (step === "add") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[13px] text-muted">
          Enter your Uzcard or Humo details. We will send an OTP to confirm the card.
        </p>
        <TextField>
          <Label>Card number</Label>
          <Input
            inputMode="numeric"
            autoComplete="cc-number"
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardInput(e.target.value))}
            placeholder="8600 0000 0000 0000"
          />
        </TextField>
        <TextField>
          <Label>Expiry (MM/YY)</Label>
          <Input
            inputMode="numeric"
            autoComplete="cc-exp"
            value={expiry}
            onChange={(e) => setExpiry(formatExpiryInput(e.target.value))}
            placeholder="09/29"
          />
        </TextField>
        <TextField>
          <Label>Card label (optional)</Label>
          <Input value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="Business card" />
        </TextField>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button isDisabled={startAdd.isPending} onPress={() => void submitStartAdd()}>
          {startAdd.isPending ? "Sending…" : "Send OTP"}
        </Button>
        <button type="button" onClick={() => setStep("select")} className="text-[13px] font-medium text-muted hover:text-foreground">
          ← Back to saved cards
        </button>
      </div>
    );
  }

  if (step === "otp") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[13px] text-muted">{otpPhone ? `OTP sent to ${otpPhone}.` : "Enter the OTP code."}</p>
        <TextField>
          <Label>OTP code</Label>
          <Input
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="456799"
          />
        </TextField>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button isDisabled={confirmAdd.isPending} onPress={() => void submitConfirm()}>
          {confirmAdd.isPending ? "Saving…" : "Confirm and save card"}
        </Button>
        <button type="button" onClick={() => setStep("add")} className="text-[13px] font-medium text-muted hover:text-foreground">
          ← Change card details
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-muted">
        Choose a saved card or add a new one. This card will be charged for renewal automatically.
      </p>

      {cards.length > 0 ? (
        <div className="flex flex-col gap-2">
          {cards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => setSelectedCardId(card.id)}
              className={`flex items-center gap-3 rounded-[12px] border px-4 py-3 text-left transition-colors ${
                effectiveSelectedCardId === card.id ? "border-accent bg-accent/10" : "border-foreground/10 hover:border-foreground/20"
              }`}
            >
              <CreditCard className="size-5 shrink-0 text-accent" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-foreground">
                  {card.card_name || card.masked_pan || "Saved card"}
                </p>
                <p className="text-[12px] text-muted">
                  {card.masked_pan}
                  {card.is_default ? " · Default" : ""}
                </p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-[12px] border border-dashed border-foreground/15 px-4 py-6 text-center text-[13px] text-muted">
          No saved cards yet — add one below.
        </div>
      )}

      <button
        type="button"
        onClick={() => setStep("add")}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border border-foreground/10 text-[13px] font-semibold text-accent hover:bg-foreground/[0.04]"
      >
        <Plus className="size-4" aria-hidden="true" />
        Add new card
      </button>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <Button isDisabled={charge.isPending || !effectiveSelectedCardId} onPress={() => void pay("card")} className="h-[52px] w-full">
        {charge.isPending ? "Processing payment…" : `Pay ${formatSom(amountUzs)}`}
      </Button>

      {(balanceQuery.data?.balance_uzs ?? 0) >= amountUzs ? (
        <Button variant="secondary" isDisabled={charge.isPending} onPress={() => void pay("balance")}>
          Pay from balance ({formatSom(balanceQuery.data?.balance_uzs ?? 0)})
        </Button>
      ) : null}

      <p className="text-center text-[11px] text-muted">Saved for automatic subscription renewal</p>
    </div>
  );
}
