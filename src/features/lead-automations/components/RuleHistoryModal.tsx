"use client";

import { Button, Modal } from "@heroui/react";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { useAutomationRunHistoryQuery } from "@/features/lead-automations/hooks/useLeadAutomations";
import type { AutomationRuleRow } from "@/features/lead-automations/types";

export function RuleHistoryModal({ rule, onClose }: { rule: AutomationRuleRow | null; onClose: () => void }) {
  const historyQuery = useAutomationRunHistoryQuery(rule?.id ?? null);

  return (
    <Modal isOpen={!!rule} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="sm">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Run history</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="max-h-[60vh] overflow-y-auto">
              <p className="mb-3 text-xs text-foreground/50">{rule?.name}</p>
              {historyQuery.isLoading ? (
                <LoadingState label="Loading history…" className="py-8" />
              ) : historyQuery.isError ? (
                <ErrorState error={historyQuery.error} onRetry={() => historyQuery.refetch()} className="py-8" />
              ) : (historyQuery.data ?? []).length === 0 ? (
                <p className="py-8 text-center text-sm text-foreground/50">No runs yet.</p>
              ) : (
                <ul className="divide-y divide-black/[0.06] text-sm dark:divide-white/[0.08]">
                  {(historyQuery.data ?? []).map((run) => (
                    <li key={run.id} className="flex items-center justify-between gap-2 py-2">
                      <span className={run.status === "error" ? "text-danger" : ""}>
                        {run.trigger_type ?? "run"} · {run.status}
                        {run.message ? ` — ${run.message}` : ""}
                      </span>
                      <span className="shrink-0 text-xs text-foreground/40">{new Date(run.created_at).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={onClose}>
                Close
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
