"use client";

import { useState } from "react";
import { Button, Input, Label, Modal, TextField, useOverlayState } from "@heroui/react";
import { CreditCard, Plus, Star, TrashBin } from "@gravity-ui/icons";

import { ApiError } from "@/types/api";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import type { SavedPaymentCard } from "@/features/billing/types";
import {
  useBillingCardsQuery,
  useConfirmAddCardMutation,
  useDeleteCardMutation,
  useSetDefaultCardMutation,
  useStartAddCardMutation,
} from "@/features/billing/hooks/useBillingSection";

function cardErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return "Only a workspace admin can manage payment cards.";
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

type Step = "form" | "otp";

export function PaymentCardsTab({ workspaceId }: { workspaceId: string }) {
  const cardsQuery = useBillingCardsQuery(workspaceId);
  const startAdd = useStartAddCardMutation(workspaceId);
  const confirmAdd = useConfirmAddCardMutation(workspaceId);
  const deleteCard = useDeleteCardMutation(workspaceId);
  const setDefault = useSetDefaultCardMutation(workspaceId);
  const modal = useOverlayState();

  const [step, setStep] = useState<Step>("form");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cardName, setCardName] = useState("");
  const [otp, setOtp] = useState("");
  const [pendingCardId, setPendingCardId] = useState<string | null>(null);
  const [otpPhone, setOtpPhone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavedPaymentCard | null>(null);

  function resetForm() {
    setStep("form");
    setCardNumber("");
    setExpiry("");
    setCardName("");
    setOtp("");
    setPendingCardId(null);
    setOtpPhone(null);
    setError(null);
  }

  function openAdd() {
    resetForm();
    modal.open();
  }

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
      await confirmAdd.mutateAsync({ card_id: pendingCardId, otp: otp.trim(), card_name: cardName.trim() || undefined });
      modal.close();
      resetForm();
    } catch (err) {
      setError(cardErrorMessage(err));
    }
  }

  async function remove(card: SavedPaymentCard) {
    if (deleteCard.isPending) return;
    try {
      await deleteCard.mutateAsync(card.id);
      setDeleteTarget(null);
    } catch (err) {
      setError(cardErrorMessage(err));
    }
  }

  if (cardsQuery.isLoading) return <LoadingState label="Loading payment cards…" className="py-12" />;
  if (cardsQuery.isError) return <ErrorState error={cardsQuery.error} onRetry={() => cardsQuery.refetch()} className="py-12" />;

  const cards = cardsQuery.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-foreground/60">Saved cards used for subscription renewals and balance top-ups.</p>
        <Button size="sm" onPress={openAdd}>
          <Plus className="size-3.5" />
          Add card
        </Button>
      </div>

      {cards.length === 0 ? (
        <EmptyState title="No saved cards" description="Add a card to enable one-click subscription renewals." className="py-10" />
      ) : (
        <ul className="space-y-2">
          {cards.map((card) => (
            <li key={card.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-black/[0.08] px-4 py-3 dark:border-white/[0.12]">
              <CreditCard className="size-5 shrink-0 text-foreground/40" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{card.card_name || card.masked_pan || "Card"}</p>
                <p className="text-xs text-foreground/50">
                  {card.masked_pan}
                  {card.vendor ? ` · ${card.vendor}` : ""}
                  {card.is_default ? (
                    <span className="ml-2 inline-flex items-center gap-0.5 font-medium text-primary">
                      <Star className="size-3" aria-hidden="true" />
                      Default
                    </span>
                  ) : null}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {!card.is_default ? (
                  <Button size="sm" variant="secondary" isDisabled={setDefault.isPending} onPress={() => setDefault.mutate(card.id)}>
                    Set default
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" isIconOnly aria-label="Remove card" onPress={() => setDeleteTarget(card)}>
                  <TrashBin className="size-4 text-danger" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal isOpen={modal.isOpen} onOpenChange={(open) => !open && modal.close()}>
        <Modal.Backdrop>
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>{step === "form" ? "Add a payment card" : "Confirm with OTP"}</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="flex flex-col gap-3">
                {step === "form" ? (
                  <>
                    <TextField>
                      <Label>Card number</Label>
                      <Input inputMode="numeric" autoComplete="cc-number" value={cardNumber} onChange={(e) => setCardNumber(formatCardInput(e.target.value))} placeholder="8600 0000 0000 0000" />
                    </TextField>
                    <TextField>
                      <Label>Expiry (MM/YY)</Label>
                      <Input inputMode="numeric" autoComplete="cc-exp" value={expiry} onChange={(e) => setExpiry(formatExpiryInput(e.target.value))} placeholder="09/29" />
                    </TextField>
                    <TextField>
                      <Label>Label (optional)</Label>
                      <Input value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="Company card" />
                    </TextField>
                  </>
                ) : (
                  <TextField>
                    <Label>{otpPhone ? `OTP sent to ${otpPhone}` : "OTP code"}</Label>
                    <Input inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="456799" />
                  </TextField>
                )}
                {error ? <p className="text-sm text-danger">{error}</p> : null}
              </Modal.Body>
              <Modal.Footer>
                {step === "otp" ? (
                  <Button variant="ghost" onPress={() => setStep("form")} className="mr-auto">
                    Back
                  </Button>
                ) : null}
                <Button variant="secondary" onPress={() => modal.close()}>
                  Cancel
                </Button>
                <Button isDisabled={startAdd.isPending || confirmAdd.isPending} onPress={() => void (step === "form" ? submitStartAdd() : submitConfirm())}>
                  {step === "form" ? (startAdd.isPending ? "Sending…" : "Send OTP") : confirmAdd.isPending ? "Saving…" : "Confirm & save"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal isOpen={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <Modal.Backdrop>
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Remove card</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="text-sm text-foreground/70">
                  Remove {deleteTarget?.masked_pan ?? deleteTarget?.card_name ?? "this card"}? This can&apos;t be undone.
                </p>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onPress={() => setDeleteTarget(null)}>
                  Cancel
                </Button>
                <Button variant="danger" isDisabled={deleteCard.isPending} onPress={() => deleteTarget && void remove(deleteTarget)}>
                  {deleteCard.isPending ? "Removing…" : "Remove"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
