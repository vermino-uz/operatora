"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Input, Modal, Switch } from "@heroui/react";
import { ArrowRight, MagicWand } from "@gravity-ui/icons";

import { ApiError } from "@/types/api";
import { aiLeadDistributionApi, type DistributionPlan, type DistributionPreview } from "@/services/api/aiLeadDistribution";

function distributionErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return "Only workspace owners/admins can distribute leads.";
    return error.message || "Something went wrong on our end. Please try again shortly.";
  }
  return "Something went wrong. Please try again.";
}

interface ChatEntry {
  id: string;
  role: "user" | "assistant";
  text: string;
  plan?: DistributionPlan;
  preview?: DistributionPreview;
  applied?: boolean;
}

/**
 * AI Lead Distribution (Phase 2c-11) — natural-language chat that parses an
 * instruction into an assignment plan, previews the per-operator split, and
 * on confirmation actually assigns the matching unassigned leads. Real
 * backend, traced in `services/api/aiLeadDistribution.ts`'s header comment
 * (`AiLeadDistributionController`/`.Service` — deterministic greedy
 * assignment, not a black box). A clean rebuild of the old frontend's
 * `AiLeadDistributionDialog.tsx` chat layout, not a visual copy.
 */
export function AiLeadDistributionDialog({ boardId, onClose }: { boardId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: ["board-ai-distribution-settings", boardId],
    queryFn: () => aiLeadDistributionApi.getSettings(boardId),
  });
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [recurringBusy, setRecurringBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries.length, sending]);

  const recurring = settingsQuery.data?.enabled ?? false;

  async function send() {
    const message = draft.trim();
    if (!message || sending) return; // guard empty + double-submit
    setDraft("");
    setBanner(null);
    setSending(true);
    setEntries((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", text: message }]);
    try {
      const { plan, preview } = await aiLeadDistributionApi.plan(boardId, message);
      setEntries((prev) => [...prev, { id: `a-${Date.now()}`, role: "assistant", text: plan.reply, plan, preview }]);
    } catch (err) {
      setEntries((prev) => [...prev, { id: `err-${Date.now()}`, role: "assistant", text: distributionErrorMessage(err) }]);
    } finally {
      setSending(false);
    }
  }

  async function confirmEntry(entry: ChatEntry) {
    if (!entry.plan || applyingId) return; // guard double-submit
    setApplyingId(entry.id);
    setBanner(null);
    try {
      const result = await aiLeadDistributionApi.apply(boardId, entry.plan);
      setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, applied: true } : e)));
      setBanner(`Assigned ${result.assigned} lead${result.assigned === 1 ? "" : "s"}.`);
      void queryClient.invalidateQueries({ queryKey: ["column-leads"] });
      void queryClient.invalidateQueries({ queryKey: ["lead-board"] });
    } catch (err) {
      setBanner(distributionErrorMessage(err));
    } finally {
      setApplyingId(null);
    }
  }

  async function toggleRecurring(checked: boolean) {
    const lastConfirmedPlan = [...entries].reverse().find((e) => e.applied)?.plan;
    setRecurringBusy(true);
    setBanner(null);
    try {
      const updated = await aiLeadDistributionApi.updateSettings(
        boardId,
        checked
          ? {
              enabled: true,
              operator_ids: lastConfirmedPlan?.operatorIds ?? [],
              mode: lastConfirmedPlan?.mode ?? "even",
              channel_filter: lastConfirmedPlan?.channelFilter ?? null,
            }
          : { enabled: false },
      );
      queryClient.setQueryData(["board-ai-distribution-settings", boardId], updated);
    } catch (err) {
      setBanner(distributionErrorMessage(err));
    } finally {
      setRecurringBusy(false);
    }
  }

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading className="flex items-center gap-2">
                <MagicWand className="size-4 text-primary" aria-hidden="true" />
                AI lead distribution
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex max-h-[75vh] flex-col gap-3">
              <p className="text-sm text-foreground/60">
                Tell AI how to split unassigned leads across operators (e.g. &quot;split Instagram leads evenly between Aziz and
                Habiba&quot;) — it previews the assignment before anything is written.
              </p>

              <div className="flex items-center justify-between gap-3 rounded-lg bg-[var(--default)] px-3 py-2">
                <span className="text-sm text-foreground/70">Recurring auto-distribution</span>
                <Switch
                  isSelected={recurring}
                  isDisabled={recurringBusy || settingsQuery.isLoading}
                  onChange={(checked) => void toggleRecurring(checked)}
                  aria-label="Recurring auto-distribution"
                >
                  <Switch.Content>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Content>
                </Switch>
              </div>

              {banner ? <p className="text-sm text-foreground/70">{banner}</p> : null}

              <div ref={scrollRef} className="min-h-[200px] flex-1 space-y-3 overflow-y-auto">
                {entries.length === 0 ? (
                  <p className="text-sm text-foreground/40">No instructions sent yet — try one of the examples above.</p>
                ) : null}
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`rounded-lg px-3 py-2 text-sm ${
                      entry.role === "user" ? "ml-8 bg-primary/10 text-foreground" : "mr-8 bg-[var(--default)] text-foreground"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{entry.text}</p>
                    {entry.preview ? (
                      <div className="mt-2 space-y-1 border-t border-border pt-2">
                        <p className="text-xs text-foreground/50">{entry.preview.leadCount} unassigned leads matched</p>
                        {entry.preview.perOperator.map((p) => (
                          <div key={p.operatorId} className="flex justify-between text-xs">
                            <span>{p.name}</span>
                            <span className="font-semibold">{p.count}</span>
                          </div>
                        ))}
                        {!entry.applied ? (
                          <Button
                            size="sm"
                            className="mt-2"
                            isDisabled={applyingId === entry.id || entry.preview.leadCount === 0}
                            onPress={() => void confirmEntry(entry)}
                          >
                            {applyingId === entry.id ? "Assigning…" : "Confirm & assign"}
                          </Button>
                        ) : (
                          <p className="mt-2 text-xs font-medium text-success">Assigned</p>
                        )}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>

              <form
                className="flex items-center gap-2 border-t border-border pt-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void send();
                }}
              >
                <Input
                  aria-label="Distribution instruction"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="e.g. Split unassigned Telegram leads evenly between all operators"
                  disabled={sending}
                  className="flex-1"
                />
                <Button type="submit" variant="primary" isIconOnly isDisabled={!draft.trim() || sending} aria-label="Send">
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              </form>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
