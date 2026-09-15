"use client";

import { useState } from "react";
import { Button, Chip, Modal, type UseOverlayStateReturn } from "@heroui/react";
import { CircleCheck, Clock, PaperPlane } from "@gravity-ui/icons";

import { ApiError } from "@/types/api";
import {
  useFeedbackDecisionMutation,
  usePendingFeedbackQuery,
  useSendSampleFeedbackMutation,
} from "@/features/operators/hooks/useOperatorFeedback";

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return "You don't have permission to send feedback.";
    if (error.isServerError) return "Something went wrong on our end. Please try again shortly.";
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

/** Two ready-made coaching samples, ported from the old frontend's
 * `SendFeedbackDialog.tsx` (`SAMPLE_KEYS` + i18next `operators.json`
 * strings, hand-carried into plain English here since this app has no
 * i18n layer). There is no free-text feedback composer in the old UI —
 * only these two canned samples plus the pending-approval queue below. */
const SAMPLE_FEEDBACKS = [
  {
    key: "communication",
    label: "Sample 1",
    title: "Improve call opening",
    content:
      "Start calls with a warm, confident introduction and confirm the customer's name early — this consistently raises engagement scores in the first 30 seconds.",
  },
  {
    key: "performance",
    label: "Sample 2",
    title: "Missed upsell opportunity",
    content:
      "During recent calls the operator did not offer the premium plan despite the customer asking about advanced features. Proactively mention upgrade options when relevant.",
  },
];

export function SendFeedbackModal({
  state,
  canApprove,
  operatorName,
}: {
  state: UseOverlayStateReturn;
  canApprove: boolean;
  operatorName: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const pendingQuery = usePendingFeedbackQuery(operatorName, state.isOpen && canApprove);
  const send = useSendSampleFeedbackMutation();
  const decide = useFeedbackDecisionMutation();

  async function handleSend(sample: { title: string; content: string }) {
    if (send.isPending) return; // guard double-submit
    setError(null);
    try {
      await send.mutateAsync({ operatorName, title: sample.title, content: sample.content });
      state.close();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function handleDecision(feedbackId: string, approve: boolean) {
    if (decide.isPending) return;
    setError(null);
    try {
      await decide.mutateAsync({ feedbackId, approve });
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Modal isOpen={state.isOpen} onOpenChange={(open) => (open ? state.setOpen(true) : state.close())}>
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Send feedback to {operatorName}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-6">
              {canApprove && pendingQuery.data && pendingQuery.data.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-semibold text-foreground">Pending approvals</h3>
                  <div className="flex max-h-48 flex-col gap-2 overflow-y-auto">
                    {pendingQuery.data.map((fb) => (
                      <div key={fb.id} className="rounded-xl border border-black/[0.08] p-3 dark:border-white/[0.12]">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-foreground">{fb.title}</p>
                          <Chip size="sm" variant="soft">
                            <Chip.Label className="flex items-center gap-1">
                              <Clock className="size-3" /> Pending
                            </Chip.Label>
                          </Chip>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-foreground/60">{fb.content}</p>
                        <div className="mt-2 flex gap-2">
                          <Button size="sm" variant="primary" onPress={() => void handleDecision(fb.id, true)}>
                            <CircleCheck className="size-3.5" aria-hidden="true" />
                            Approve &amp; send
                          </Button>
                          <Button size="sm" variant="secondary" onPress={() => void handleDecision(fb.id, false)}>
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-foreground">Sample coaching feedback</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {SAMPLE_FEEDBACKS.map((sample) => (
                    <div key={sample.key} className="rounded-xl border border-black/[0.08] p-3 dark:border-white/[0.12]">
                      <p className="text-sm font-medium text-foreground">{sample.title}</p>
                      <p className="mt-1 text-xs text-foreground/60">&ldquo;{sample.content}&rdquo;</p>
                      <div className="mt-2 flex items-center justify-between">
                        <Chip size="sm" variant="soft">
                          <Chip.Label>{sample.label}</Chip.Label>
                        </Chip>
                        <Button size="sm" variant="primary" isDisabled={send.isPending} onPress={() => void handleSend(sample)}>
                          <PaperPlane className="size-3.5" aria-hidden="true" />
                          Send
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {error ? (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              ) : null}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={() => state.close()}>
                Close
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
