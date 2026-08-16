"use client";

import { useState } from "react";
import { Button, Modal } from "@heroui/react";
import { Minus, Plus, Sparkles } from "@gravity-ui/icons";

import { ApiError } from "@/types/api";
import { useRentSeatMutation, useSeatPurchasePolling } from "@/features/team/hooks/useBilling";
import { resolveSeatPriceUzs } from "@/features/team/operatorSeats";
import type { BillingFeatures, RentOperatorSeatResponse } from "@/features/team/types";

/** Kill-switch mirroring the old frontend's `PAYME_PAYMENTS_ENABLED` —
 * off by default, flip with `NEXT_PUBLIC_PAYME_PAYMENTS_ENABLED=1`. */
const PAYME_PAYMENTS_ENABLED = process.env.NEXT_PUBLIC_PAYME_PAYMENTS_ENABLED === "1";

function formatSom(n: number): string {
  return `${new Intl.NumberFormat("uz-UZ").format(n).replace(/ /g, " ")} so'm`;
}

function actionErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return "You don't have permission to purchase seats.";
    if (error.isValidationError) return error.message;
    if (error.isServerError) return "Something went wrong on our end. Please try again shortly.";
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

type Step = "quantity" | "provider" | "success";

/**
 * Rent-a-seat flow — quantity stepper (1-20) -> price calc -> confirm ->
 * payment-provider choice (Payme/Click/Paylov popups) -> 10-minute
 * reconciliation poll -> success. Ported from `OperatorUsersManager`'s
 * `rentSeatMutation` + its two `AlertDialog`s. Idempotency/double-submit:
 * the rent mutation is guarded by `isPending`, and the modal can't be
 * re-submitted once a pending order exists (moves straight to the
 * provider-choice step).
 */
export function RentSeatModal({
  isOpen,
  workspaceId,
  billing,
  onClose,
}: {
  isOpen: boolean;
  workspaceId: string;
  billing: BillingFeatures | null | undefined;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>("quantity");
  const [quantity, setQuantity] = useState(1);
  const [order, setOrder] = useState<RentOperatorSeatResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [popupBlockedFor, setPopupBlockedFor] = useState<string | null>(null);

  const rent = useRentSeatMutation(workspaceId);
  const priceUzs = resolveSeatPriceUzs(billing);
  const totalUzs = priceUzs * quantity;

  const initialExtra = billing?.extra_operator_seats ?? 0;
  const targetExtra = order ? initialExtra + (order.quantity || quantity) : null;

  const { timedOut } = useSeatPurchasePolling({
    workspaceId,
    targetExtraSeats: targetExtra,
    active: step === "provider" && !!order,
    onComplete: () => setStep("success"),
  });

  function reset() {
    setStep("quantity");
    setQuantity(1);
    setOrder(null);
    setError(null);
    setPopupBlockedFor(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleConfirmRent() {
    if (rent.isPending) return; // guard double-submit — a money-touching action
    setError(null);
    try {
      const result = await rent.mutateAsync(quantity);
      const hasAnyUrl = (PAYME_PAYMENTS_ENABLED && result.payme_url) || result.click_url || result.paylov_url || result.payment_url;
      if (!hasAnyUrl) {
        setError("No payment provider is currently available. Please try again shortly.");
        return;
      }
      setOrder(result);
      setStep("provider");
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  }

  function openProvider(name: string, url: string | null | undefined) {
    if (!url) return;
    setPopupBlockedFor(null);
    const popup = window.open(url, `operatora-seat-${name}`, "popup=yes,width=500,height=720");
    if (!popup) setPopupBlockedFor(name);
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <Modal.Backdrop>
        <Modal.Container size="sm">
          <Modal.Dialog>
            {step === "quantity" ? (
              <>
                <Modal.Header>
                  <Modal.Heading>Rent premium seats</Modal.Heading>
                </Modal.Header>
                <Modal.Body className="flex flex-col gap-4">
                  <div className="rounded-xl border-2 border-violet-200 bg-violet-50/60 px-4 py-4 dark:border-violet-900/40 dark:bg-violet-950/20">
                    <p className="mb-3 text-center text-sm font-semibold text-violet-900 dark:text-violet-200">Quantity</p>
                    <div className="flex items-center justify-center gap-3">
                      <Button
                        isIconOnly
                        variant="secondary"
                        aria-label="Decrease quantity"
                        isDisabled={quantity <= 1}
                        onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                      >
                        <Minus className="size-4" aria-hidden="true" />
                      </Button>
                      <div className="min-w-[72px] rounded-xl border-2 border-violet-300 bg-white px-3 py-2 text-center shadow-sm dark:bg-black/40">
                        <span className="block text-2xl leading-none font-bold tabular-nums text-violet-950 dark:text-violet-100">
                          {quantity}
                        </span>
                        <span className="mt-1 block text-[10px] font-semibold tracking-wide text-violet-600 uppercase dark:text-violet-400">
                          {quantity === 1 ? "seat" : "seats"}
                        </span>
                      </div>
                      <Button
                        isIconOnly
                        variant="secondary"
                        aria-label="Increase quantity"
                        isDisabled={quantity >= 20}
                        onPress={() => setQuantity((q) => Math.min(20, q + 1))}
                      >
                        <Plus className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                    <p className="text-xs text-amber-900 dark:text-amber-200">Unit price: {formatSom(priceUzs)} / month</p>
                    <p className="text-base font-bold text-amber-950 dark:text-amber-100">
                      Total due today: {formatSom(totalUzs)} for {quantity} {quantity === 1 ? "seat" : "seats"}
                    </p>
                  </div>
                  {error ? <p className="text-sm text-danger">{error}</p> : null}
                </Modal.Body>
                <Modal.Footer>
                  <Button variant="secondary" onPress={handleClose}>
                    Cancel
                  </Button>
                  <Button variant="primary" isDisabled={rent.isPending} onPress={handleConfirmRent}>
                    {rent.isPending ? "Preparing…" : `Pay ${formatSom(totalUzs)}`}
                  </Button>
                </Modal.Footer>
              </>
            ) : step === "provider" ? (
              <>
                <Modal.Header>
                  <Modal.Heading>Choose a payment method</Modal.Heading>
                </Modal.Header>
                <Modal.Body className="flex flex-col gap-4">
                  <p className="text-sm text-foreground/60">
                    A checkout window will open. We&apos;ll confirm automatically once payment is received.
                  </p>
                  <div className="flex gap-2">
                    {PAYME_PAYMENTS_ENABLED ? (
                      <Button
                        fullWidth
                        isDisabled={!order?.payme_url}
                        className="bg-[#00B0FF] text-white"
                        onPress={() => openProvider("payme", order?.payme_url)}
                      >
                        Payme
                      </Button>
                    ) : null}
                    <Button
                      fullWidth
                      isDisabled={!order?.click_url}
                      className="bg-[#16a34a] text-white"
                      onPress={() => openProvider("click", order?.click_url)}
                    >
                      Click
                    </Button>
                    <Button
                      fullWidth
                      isDisabled={!order?.paylov_url}
                      className="bg-[#0f766e] text-white"
                      onPress={() => openProvider("paylov", order?.paylov_url)}
                    >
                      Paylov
                    </Button>
                  </div>
                  {popupBlockedFor ? (
                    <p className="text-sm text-danger">
                      Your browser blocked the {popupBlockedFor} checkout popup. Allow popups for this site and try again.
                    </p>
                  ) : null}
                  {timedOut ? (
                    <p className="text-sm text-warning">
                      We haven&apos;t confirmed the payment yet. If you completed checkout, your seats will appear shortly —
                      you can close this and check back.
                    </p>
                  ) : (
                    <p className="flex items-center gap-2 text-xs text-foreground/50">
                      <Sparkles className="size-3.5 shrink-0" aria-hidden="true" />
                      Waiting for payment confirmation…
                    </p>
                  )}
                </Modal.Body>
                <Modal.Footer>
                  <Button variant="secondary" onPress={handleClose}>
                    Close
                  </Button>
                </Modal.Footer>
              </>
            ) : (
              <>
                <Modal.Header>
                  <Modal.Heading>Seats added</Modal.Heading>
                </Modal.Header>
                <Modal.Body>
                  <p className="text-sm text-foreground/70">
                    {order?.quantity ?? quantity} premium {(order?.quantity ?? quantity) === 1 ? "seat is" : "seats are"} now available
                    to invite teammates into.
                  </p>
                </Modal.Body>
                <Modal.Footer>
                  <Button variant="primary" onPress={handleClose}>
                    Done
                  </Button>
                </Modal.Footer>
              </>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
