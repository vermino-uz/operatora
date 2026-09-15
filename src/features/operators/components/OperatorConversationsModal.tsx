"use client";

import { useState } from "react";
import { Button, Chip, Modal, type UseOverlayStateReturn } from "@heroui/react";
import { Clock, Handset, Star } from "@gravity-ui/icons";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConversationDetailPanel } from "@/features/conversations/components/ConversationDetailPanel";
import { useOperatorConversationsByNameQuery } from "@/features/operators/hooks/useOperatorConversationsByNameQuery";
import type { OperatorConversationRow } from "@/features/operators/types";

function sentimentColor(sentiment: string | null): "success" | "danger" | "default" {
  if (sentiment === "positive") return "success";
  if (sentiment === "negative") return "danger";
  return "default";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Ported from the old frontend's `OperatorConversationsDialog.tsx` —
 * lists an operator's matched conversation history, with a drill-in to
 * full conversation detail (this rebuild reuses the real
 * `ConversationDetailPanel` already built for `/conversations`, embedded
 * here via its `forceBack` prop rather than duplicating a second detail
 * view). */
export function OperatorConversationsModal({
  state,
  operatorName,
  aliases,
}: {
  state: UseOverlayStateReturn;
  operatorName: string;
  aliases: { displayName?: string; storedName?: string; email?: string; fullName?: string };
}) {
  const [openConversationId, setOpenConversationId] = useState<string | null>(null);
  const query = useOperatorConversationsByNameQuery(operatorName, aliases, state.isOpen);

  function handleClose() {
    setOpenConversationId(null);
    state.close();
  }

  return (
    <Modal isOpen={state.isOpen} onOpenChange={(open) => (open ? state.setOpen(true) : handleClose())}>
      <Modal.Backdrop>
        <Modal.Container size="lg" scroll="inside">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>
                {operatorName}&apos;s calls {query.data ? `(${query.data.length})` : ""}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              {openConversationId ? (
                <ConversationDetailPanel
                  conversationId={openConversationId}
                  forceBack
                  onBack={() => setOpenConversationId(null)}
                />
              ) : query.isLoading ? (
                <LoadingState label="Loading conversations…" />
              ) : query.isError ? (
                <ErrorState error={query.error} onRetry={() => query.refetch()} />
              ) : !query.data || query.data.length === 0 ? (
                <EmptyState title="No calls found" description="This operator has no conversations in this range yet." />
              ) : (
                <div className="flex flex-col gap-3">
                  {query.data.map((conversation: OperatorConversationRow) => (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => setOpenConversationId(conversation.id)}
                      className="rounded-xl border border-black/[0.08] p-3 text-left transition-colors hover:bg-black/[0.02] dark:border-white/[0.12] dark:hover:bg-white/[0.04]"
                    >
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          {conversation.client_name || conversation.client_phone || "Unknown"}
                        </p>
                        <Chip size="sm" color={sentimentColor(conversation.sentiment)} variant="soft">
                          <Chip.Label>{conversation.sentiment ?? "neutral"}</Chip.Label>
                        </Chip>
                        {conversation.ai_score ? (
                          <span className="flex items-center gap-1 text-xs font-semibold text-foreground/70">
                            <Star className="size-3" aria-hidden="true" />
                            {conversation.ai_score}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-xs text-foreground/50">
                        <span className="flex items-center gap-1">
                          <Handset className="size-3" aria-hidden="true" />
                          {conversation.client_phone ?? "No phone"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" aria-hidden="true" />
                          {conversation.duration ?? "—"}
                        </span>
                        <span>{formatDate(conversation.created_at)}</span>
                      </div>
                      {conversation.summary ? (
                        <p className="mt-1 line-clamp-2 text-xs text-foreground/60">{conversation.summary}</p>
                      ) : null}
                    </button>
                  ))}
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={handleClose}>
                Close
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
