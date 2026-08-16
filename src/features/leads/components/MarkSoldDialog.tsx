"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Label, Modal, TextArea, TextField } from "@heroui/react";

import { markSoldSchema, type MarkSoldFormValues } from "@/features/leads/schema";
import { useMarkSoldMutation } from "@/features/leads/hooks/useLeadMutations";
import { leadActionErrorMessage, parseFieldRequiredError } from "@/features/leads/leadActionError";
import { RequireFieldDialog } from "@/features/leads/components/RequireFieldDialog";
import type { LeadRow } from "@/features/leads/types";

/**
 * `PATCH /sold-leads-list/:id/mark-sold` — board-level counterpart of the
 * old frontend's `MarkLeadSoldDialog.tsx`, confirm + optional note. Always
 * mounted/unmounted by its caller (not a persistent `isOpen` toggle), so it
 * opens fresh every time — matches this codebase's other one-shot
 * confirmation dialogs (e.g. `TeamMembersPanel`'s remove-member confirm).
 */
export function MarkSoldDialog({
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
  const markSold = useMarkSoldMutation(boardId);
  const [error, setError] = useState<string | null>(null);
  // `FIELD_REQUIRED:...` gate failure (real 400, see
  // `RequireFieldDialog`'s doc comment) — pending note value is kept so the
  // retry after the guided dialog resolves it reuses what the user typed.
  const [missingFields, setMissingFields] = useState<string[] | null>(null);
  const [pendingNote, setPendingNote] = useState<string | undefined>(undefined);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<MarkSoldFormValues>({
    resolver: zodResolver(markSoldSchema),
    defaultValues: { note: "" },
  });

  async function submitMarkSold(note: string | undefined) {
    try {
      await markSold.mutateAsync({ leadId, note });
      onMarked();
    } catch (err) {
      const missing = parseFieldRequiredError(err);
      if (missing) {
        setPendingNote(note);
        setMissingFields(missing);
        return;
      }
      setError(leadActionErrorMessage(err));
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    if (markSold.isPending) return; // guard double-submit
    setError(null);
    await submitMarkSold(values.note);
  });

  if (missingFields) {
    return (
      <RequireFieldDialog
        lead={lead}
        missingFields={missingFields}
        onClose={() => setMissingFields(null)}
        onResolved={() => {
          setMissingFields(null);
          void submitMarkSold(pendingNote);
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
              <Modal.Heading>Mark lead as sold</Modal.Heading>
            </Modal.Header>
            <form onSubmit={onSubmit} noValidate>
              <Modal.Body className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto">
                <p className="text-sm text-foreground/70">
                  This moves the lead to the Sold tab. You can add a note about the sale below.
                </p>
                <Controller
                  name="note"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField {...field} isInvalid={fieldState.invalid}>
                      <Label>Note (optional)</Label>
                      <TextArea rows={3} placeholder="e.g. Bought a 3-month subscription" />
                    </TextField>
                  )}
                />
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
                <Button type="submit" variant="primary" isDisabled={isSubmitting || markSold.isPending}>
                  {isSubmitting || markSold.isPending ? "Marking…" : "Mark sold"}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
