"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, ListBox, Modal, Select } from "@heroui/react";
import { ChevronDown, ChevronRight } from "@gravity-ui/icons";

import { useSessionStore } from "@/state/session-store";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { markRejectedSchema, type MarkRejectedFormValues } from "@/features/leads/schema";
import { useMarkRejectedMutation } from "@/features/leads/hooks/useLeadMutations";
import { useLeadRejectionReasonsQuery } from "@/features/leads/hooks/useLeadRejectionReasons";
import { RejectionReasonsManager } from "@/features/leads/components/RejectionReasonsManager";
import { leadActionErrorMessage, parseFieldRequiredError } from "@/features/leads/leadActionError";
import { RequireFieldDialog } from "@/features/leads/components/RequireFieldDialog";
import type { LeadRow } from "@/features/leads/types";

/**
 * `PATCH /rejected-leads-list/:id/mark-rejected` — board-level counterpart
 * of the old frontend's `MarkLeadRejectedDialog.tsx`. `reason` is a mandatory
 * `Select` (not free text), backed by `GET /lead-rejection-reasons` — always
 * non-empty (server-side defaults), but a "Manage reasons" section is still
 * built per the brief so a workspace can configure its own list rather than
 * relying only on the built-in Uzbek defaults.
 */
export function MarkRejectedDialog({
  boardId,
  lead,
  onClose,
  onMarked,
}: {
  boardId: string;
  lead: LeadRow;
  onClose: () => void;
  onMarked: () => void;
}) {
  const leadId = lead.id;
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const reasonsQuery = useLeadRejectionReasonsQuery(workspaceId);
  const markRejected = useMarkRejectedMutation(boardId);
  const [error, setError] = useState<string | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  // `FIELD_REQUIRED:...` gate failure (real 400, same as Mark Sold — see
  // `RequireFieldDialog`'s doc comment).
  const [missingFields, setMissingFields] = useState<string[] | null>(null);
  const [pendingReason, setPendingReason] = useState<string>("");

  const reasons = reasonsQuery.data ?? [];

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<MarkRejectedFormValues>({
    resolver: zodResolver(markRejectedSchema),
    defaultValues: { reason: "" },
  });

  async function submitMarkRejected(reason: string) {
    try {
      await markRejected.mutateAsync({ leadId, reason });
      onMarked();
    } catch (err) {
      const missing = parseFieldRequiredError(err);
      if (missing) {
        setPendingReason(reason);
        setMissingFields(missing);
        return;
      }
      setError(leadActionErrorMessage(err));
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    if (markRejected.isPending) return; // guard double-submit
    setError(null);
    await submitMarkRejected(values.reason);
  });

  if (missingFields) {
    return (
      <RequireFieldDialog
        lead={lead}
        missingFields={missingFields}
        onClose={() => setMissingFields(null)}
        onResolved={() => {
          setMissingFields(null);
          void submitMarkRejected(pendingReason);
        }}
      />
    );
  }

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Mark lead as rejected</Modal.Heading>
            </Modal.Header>
            <form onSubmit={onSubmit} noValidate>
              <Modal.Body className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto">
                <p className="text-sm text-foreground/70">This moves the lead to the Rejected tab.</p>

                {reasonsQuery.isLoading ? (
                  <LoadingState label="Loading reasons…" />
                ) : reasonsQuery.isError ? (
                  <ErrorState error={reasonsQuery.error} onRetry={() => reasonsQuery.refetch()} />
                ) : (
                  <Controller
                    name="reason"
                    control={control}
                    render={({ field, fieldState }) => (
                      <div>
                        <p className="mb-1 text-xs text-foreground/50">Reason</p>
                        <Select
                          aria-label="Rejection reason"
                          value={field.value || undefined}
                          placeholder="Select a reason…"
                          isInvalid={fieldState.invalid}
                          onChange={(key) => field.onChange(typeof key === "string" ? key : "")}
                        >
                          <Select.Trigger>
                            <Select.Value />
                            <Select.Indicator />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox items={reasons.map((r) => ({ id: r, label: r }))}>
                              {(opt) => (
                                <ListBox.Item id={opt.id} textValue={opt.label}>
                                  {opt.label}
                                  <ListBox.ItemIndicator />
                                </ListBox.Item>
                              )}
                            </ListBox>
                          </Select.Popover>
                        </Select>
                        {fieldState.error ? <p className="mt-1 text-xs text-danger">{fieldState.error.message}</p> : null}
                      </div>
                    )}
                  />
                )}

                <button
                  type="button"
                  onClick={() => setManageOpen((v) => !v)}
                  className="flex w-fit items-center gap-1 text-xs text-foreground/60 hover:text-foreground"
                >
                  {manageOpen ? <ChevronDown className="size-3.5" aria-hidden="true" /> : <ChevronRight className="size-3.5" aria-hidden="true" />}
                  Manage reasons
                </button>
                {manageOpen && workspaceId ? <RejectionReasonsManager workspaceId={workspaceId} reasons={reasons} /> : null}

                {error ? (
                  <p role="alert" className="text-sm text-danger">
                    {error}
                  </p>
                ) : null}
              </Modal.Body>
              <Modal.Footer>
                <Button type="button" variant="secondary" onPress={onClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  isDisabled={isSubmitting || markRejected.isPending || reasons.length === 0}
                >
                  {isSubmitting || markRejected.isPending ? "Marking…" : "Mark rejected"}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
