"use client";

import { useState } from "react";
import { Button, Input, Label, Modal, TextField, type UseOverlayStateReturn } from "@heroui/react";

import { ApiError } from "@/types/api";
import { LoadingState } from "@/components/shared/LoadingState";
import { useOperatorProfileQuery, useUpdateOperatorProfileMutation } from "@/features/operators/hooks/useOperatorProfile";

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return "You don't have permission to edit operators.";
    if (error.isValidationError) return error.message;
    if (error.isServerError) return "Something went wrong on our end. Please try again shortly.";
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

/** Ported from the old frontend's `EditOperatorDialog.tsx` — the only
 * editable field on an `operators` record from this UI is the internal
 * PBX extension number (`PATCH /operators-page/operator-profile/
 * :profileId`); everything else (name, email) is read from `profiles`
 * and edited elsewhere (Settings → Team). */
export function EditOperatorModal({
  state,
  profileId,
  operatorName,
}: {
  state: UseOverlayStateReturn;
  profileId: string | null;
  operatorName: string;
}) {
  const [internalNumber, setInternalNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const profileQuery = useOperatorProfileQuery(profileId, operatorName, state.isOpen);
  const update = useUpdateOperatorProfileMutation();

  // Render-time "adjust state on data change" (same pattern used by
  // `EditMemberModal`) instead of a `useEffect` — seeds the input from
  // the fetched record as soon as it arrives, without an extra render
  // pass or a set-state-in-effect lint violation.
  const [trackedProfileId, setTrackedProfileId] = useState<string | null>(null);
  if (profileQuery.data && profileQuery.data.id !== trackedProfileId) {
    setTrackedProfileId(profileQuery.data.id);
    setInternalNumber(profileQuery.data.internal_number ?? "");
  }

  function handleClose() {
    setError(null);
    update.reset();
    state.close();
  }

  async function handleSave() {
    if (!profileId || update.isPending) return; // guard double-submit
    setError(null);
    try {
      await update.mutateAsync({ profileId, internalNumber, operatorName });
      handleClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Modal
      isOpen={state.isOpen}
      onOpenChange={(open) => {
        if (open) state.setOpen(true);
        else handleClose();
      }}
    >
      <Modal.Backdrop>
        <Modal.Container size="sm">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Edit {operatorName}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4">
              {profileQuery.isLoading ? (
                <LoadingState label="Loading operator…" />
              ) : profileQuery.isError ? (
                <p className="text-sm text-danger">{errorMessage(profileQuery.error)}</p>
              ) : (
                <TextField value={internalNumber} onChange={setInternalNumber} maxLength={10}>
                  <Label>Internal extension number</Label>
                  <Input placeholder="e.g. 105" />
                </TextField>
              )}
              {error ? (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              ) : null}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={handleClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                isDisabled={update.isPending || profileQuery.isLoading || !profileQuery.data}
                onPress={() => void handleSave()}
              >
                {update.isPending ? "Saving…" : "Save changes"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
