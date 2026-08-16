"use client";

import { useState } from "react";
import { Button, Chip, Modal, useOverlayState } from "@heroui/react";

import { ApiError } from "@/types/api";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import type { BillingInvoice } from "@/features/billing/types";
import { formatSom } from "@/features/billing/types";
import {
  useBillingCardsQuery,
  useBillingInvoicesQuery,
  useChargeSubscriptionMutation,
  useDeclineSeatMutation,
  useWorkspaceBalanceQuery,
} from "@/features/billing/hooks/useBillingSection";

function payErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return "Only the workspace owner can pay a subscription invoice.";
    if (error.isValidationError) return error.message;
    return error.message;
  }
  return "Payment failed. Please try again.";
}

function dateLabel(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function InvoicesTab({ workspaceId }: { workspaceId: string }) {
  const invoicesQuery = useBillingInvoicesQuery(workspaceId);
  const cardsQuery = useBillingCardsQuery(workspaceId);
  const charge = useChargeSubscriptionMutation(workspaceId);
  const decline = useDeclineSeatMutation(workspaceId);
  const balanceQuery = useWorkspaceBalanceQuery(workspaceId);
  const detailState = useOverlayState();
  const [selected, setSelected] = useState<BillingInvoice | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  function openDetail(inv: BillingInvoice) {
    setSelected(inv);
    setSelectedCardId(null);
    setPayError(null);
    detailState.open();
  }

  async function pay(method: "card" | "balance") {
    if (!selected?.subscription_order_id || charge.isPending) return; // guard double-submit, money-touching
    if (method === "card" && !selectedCardId) {
      setPayError("Select a card first.");
      return;
    }
    setPayError(null);
    try {
      await charge.mutateAsync({
        sub_id: selected.subscription_order_id,
        card_id: method === "card" ? (selectedCardId ?? undefined) : undefined,
        payment_method: method,
        set_default: true,
      });
      detailState.close();
    } catch (err) {
      setPayError(payErrorMessage(err));
    }
  }

  async function removeVacantSeat() {
    if (decline.isPending) return;
    setPayError(null);
    try {
      await decline.mutateAsync(1);
    } catch (err) {
      setPayError(payErrorMessage(err));
    }
  }

  if (invoicesQuery.isLoading) return <LoadingState label="Loading invoices…" className="py-12" />;
  if (invoicesQuery.isError) return <ErrorState error={invoicesQuery.error} onRetry={() => invoicesQuery.refetch()} className="py-12" />;

  const rows = invoicesQuery.data ?? [];
  const cards = cardsQuery.data ?? [];

  if (rows.length === 0) {
    return <EmptyState title="No invoices yet" description="Paid and pending invoices will appear here." className="py-12" />;
  }

  return (
    <div className="space-y-2">
      <ul className="divide-y divide-black/[0.06] overflow-hidden rounded-xl border border-black/[0.08] dark:divide-white/[0.08] dark:border-white/[0.12]">
        {rows.map((inv) => {
          const unpaid = inv.status === "pending";
          const kindLabel = inv.kind === "operator_seat" ? "Operator seats" : "Subscription";
          const title = inv.plan_name || kindLabel;
          return (
            <li key={inv.id}>
              <button
                type="button"
                onClick={() => openDetail(inv)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.04]"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate text-sm font-medium">
                    <span className="truncate">
                      {title}
                      {inv.cycle ? ` · ${inv.cycle}` : ""}
                    </span>
                    <Chip size="sm" color={unpaid ? "warning" : "success"} variant="soft">
                      <Chip.Label>{unpaid ? "Unpaid" : "Paid"}</Chip.Label>
                    </Chip>
                  </p>
                  <p className="mt-0.5 text-xs text-foreground/50">
                    {unpaid ? dateLabel(inv.created_at) : dateLabel(inv.paid_at)}
                    {!unpaid && inv.payment_method ? ` · ${inv.payment_method}` : ""} · {kindLabel}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums">{formatSom(inv.amount_uzs)}</p>
                  <p className="text-xs font-medium text-primary">{unpaid ? "Pay now" : "View"}</p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <Modal isOpen={detailState.isOpen} onOpenChange={(open) => !open && detailState.close()}>
        <Modal.Backdrop>
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Invoice detail</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="flex flex-col gap-4">
                {selected ? (
                  <>
                    <div>
                      <p className="text-xs text-foreground/50">{selected.external_order_id || selected.id}</p>
                      {selected.status === "pending" ? <p className="mt-1 text-xs font-medium text-warning">Unpaid</p> : null}
                    </div>
                    <ul className="divide-y divide-black/[0.06] text-sm dark:divide-white/[0.08]">
                      {(selected.line_items ?? []).map((li) => (
                        <li key={li.key} className="flex items-center justify-between gap-3 py-1.5">
                          <span className="text-foreground/70">
                            {li.label} {li.quantity > 1 ? `× ${li.quantity}` : ""}
                          </span>
                          <span className="tabular-nums">{formatSom(li.amount_uzs)}</span>
                        </li>
                      ))}
                      <li className="flex items-center justify-between gap-3 py-1.5 font-semibold">
                        <span>Total</span>
                        <span className="tabular-nums">{formatSom(selected.amount_uzs)}</span>
                      </li>
                    </ul>

                    {selected.status === "pending" && (selected.vacant_operator_seats ?? 0) > 0 ? (
                      <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs">
                        <p>
                          This invoice includes {selected.vacant_operator_seats} unused premium seat
                          {selected.vacant_operator_seats === 1 ? "" : "s"}.
                        </p>
                        <Button size="sm" variant="secondary" className="mt-2" isDisabled={decline.isPending} onPress={() => void removeVacantSeat()}>
                          Remove one unused seat
                        </Button>
                      </div>
                    ) : null}

                    {selected.status === "pending" && selected.subscription_order_id ? (
                      <div className="space-y-3">
                        {cards.length > 0 ? (
                          <div className="space-y-1.5">
                            <p className="text-xs font-medium text-foreground/60">Pay with a saved card</p>
                            {cards.map((card) => (
                              <button
                                key={card.id}
                                type="button"
                                onClick={() => setSelectedCardId(card.id)}
                                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                                  selectedCardId === card.id ? "border-primary bg-primary/5" : "border-black/[0.08] hover:bg-black/[0.02] dark:border-white/[0.12]"
                                }`}
                              >
                                <span className="truncate font-medium">{card.card_name || card.masked_pan || "Card"}</span>
                                {card.masked_pan ? <span className="ml-auto shrink-0 text-xs text-foreground/50">{card.masked_pan}</span> : null}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-foreground/50">No saved cards yet — add one under the Payment cards tab.</p>
                        )}
                        {payError ? <p className="text-sm text-danger">{payError}</p> : null}
                        <div className="flex flex-col gap-2">
                          <Button isDisabled={charge.isPending || !selectedCardId} onPress={() => void pay("card")}>
                            {charge.isPending ? "Paying…" : `Pay ${formatSom(selected.amount_uzs)} with card`}
                          </Button>
                          {(balanceQuery.data?.balance_uzs ?? 0) >= selected.amount_uzs ? (
                            <Button variant="secondary" isDisabled={charge.isPending} onPress={() => void pay("balance")}>
                              Pay with balance ({formatSom(balanceQuery.data?.balance_uzs ?? 0)})
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ) : selected.status !== "pending" ? (
                      <p className="text-xs text-foreground/50">
                        Payment method: <span className="font-medium text-foreground/70">{selected.payment_method || selected.provider || "—"}</span>
                      </p>
                    ) : null}
                  </>
                ) : null}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onPress={() => detailState.close()}>
                  Close
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
