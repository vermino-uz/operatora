"use client";

import { useState } from "react";
import { Button, Chip, ListBox, Modal, Select, type UseOverlayStateReturn } from "@heroui/react";
import { Calendar, FileText, Persons } from "@gravity-ui/icons";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAllFeedbacksQuery } from "@/features/operators/hooks/useOperatorFeedback";

const STATUS_OPTIONS = [
  { id: "all", label: "All statuses" },
  { id: "approved", label: "Approved" },
  { id: "pending", label: "Pending" },
  { id: "rejected", label: "Rejected" },
];

const DAYS_OPTIONS: { id: "7" | "30" | "90"; label: string }[] = [
  { id: "7", label: "Last 7 days" },
  { id: "30", label: "Last 30 days" },
  { id: "90", label: "Last 90 days" },
];

function statusColor(status: string): "success" | "warning" | "danger" | "default" {
  if (status === "approved") return "success";
  if (status === "pending") return "warning";
  if (status === "rejected") return "danger";
  return "default";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Ported from the old frontend's `AllFeedbacksDialog.tsx` — admin/
 * sales_manager coaching-feedback overview with completion/pass-rate
 * stats. CSV export isn't reproduced (a client-only convenience the old
 * dialog had; skipped here to keep scope to real backend-driven content,
 * can be added later without any backend dependency if wanted). */
export function AllFeedbacksModal({ state, canView }: { state: UseOverlayStateReturn; canView: boolean }) {
  const [status, setStatus] = useState("all");
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const query = useAllFeedbacksQuery({ status, days }, state.isOpen && canView);

  return (
    <Modal isOpen={state.isOpen} onOpenChange={(open) => (open ? state.setOpen(true) : state.close())}>
      <Modal.Backdrop>
        <Modal.Container size="lg" scroll="inside">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading className="flex items-center gap-2">
                <FileText className="size-4" aria-hidden="true" />
                All feedback
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Select aria-label="Status" value={status} onChange={(key) => typeof key === "string" && setStatus(key)} variant="secondary" className="w-40">
                  <Select.Trigger className="h-9">
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox items={STATUS_OPTIONS}>
                      {(opt) => (
                        <ListBox.Item id={opt.id} textValue={opt.label}>
                          {opt.label}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      )}
                    </ListBox>
                  </Select.Popover>
                </Select>

                <Select
                  aria-label="Time range"
                  value={String(days)}
                  onChange={(key) => typeof key === "string" && setDays(Number(key) as 7 | 30 | 90)}
                  variant="secondary"
                  className="w-40"
                >
                  <Select.Trigger className="h-9">
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox items={DAYS_OPTIONS}>
                      {(opt) => (
                        <ListBox.Item id={opt.id} textValue={opt.label}>
                          {opt.label}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      )}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </div>

              <div className="max-h-[60vh] overflow-y-auto">
                {query.isLoading ? (
                  <LoadingState label="Loading feedback…" />
                ) : query.isError ? (
                  <ErrorState error={query.error} onRetry={() => query.refetch()} />
                ) : !query.data || query.data.length === 0 ? (
                  <EmptyState title="No feedback in this range" description="Try a wider date range or a different status." />
                ) : (
                  <div className="flex flex-col gap-3">
                    {query.data.map((fb) => (
                      <div key={fb.id} className="rounded-xl border border-black/[0.08] p-4 dark:border-white/[0.12]">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{fb.title}</p>
                            <div className="mt-1 flex items-center gap-3 text-xs text-foreground/50">
                              <span className="flex items-center gap-1">
                                <Calendar className="size-3" aria-hidden="true" />
                                {formatDate(fb.created_at)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Persons className="size-3" aria-hidden="true" />
                                {fb.stats.totalOperators} operator{fb.stats.totalOperators === 1 ? "" : "s"}
                              </span>
                            </div>
                          </div>
                          <Chip size="sm" color={statusColor(fb.status)} variant="soft">
                            <Chip.Label>{fb.status}</Chip.Label>
                          </Chip>
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                          {[
                            ["Generated", fb.stats.quizzesGenerated],
                            ["Completed", fb.stats.completed],
                            ["Passed", fb.stats.passed],
                            ["Failed", fb.stats.failed],
                            ["Pending", fb.stats.pending],
                            ["Avg score", `${fb.stats.avgScore}%`],
                          ].map(([label, value]) => (
                            <div key={label} className="rounded-lg bg-black/[0.03] p-2 text-center dark:bg-white/[0.05]">
                              <p className="text-sm font-semibold text-foreground">{value}</p>
                              <p className="text-[10px] text-foreground/50">{label}</p>
                            </div>
                          ))}
                        </div>

                        {fb.target_operators && fb.target_operators.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {fb.target_operators.map((op) => (
                              <Chip key={op} size="sm" variant="soft">
                                <Chip.Label>{op}</Chip.Label>
                              </Chip>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
