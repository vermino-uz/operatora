"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Label, Modal, TextField } from "@heroui/react";

import { createBoardSchema, type CreateBoardFormValues } from "@/features/leads/schema";
import { useCreateBoardMutation } from "@/features/leads/hooks/useBoardManagement";
import { leadActionErrorMessage } from "@/features/leads/leadActionError";

/** `POST /boards` (Phase 2c-5, item 4) — the new board comes pre-seeded with
 * the default pipeline server-side, so it's immediately usable (matches
 * every other board in the workspace). */
export function CreateBoardDialog({
  workspaceId,
  onClose,
  onCreated,
}: {
  workspaceId: string | null;
  onClose: () => void;
  onCreated: (boardId: string) => void;
}) {
  const createBoard = useCreateBoardMutation(workspaceId);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<CreateBoardFormValues>({
    resolver: zodResolver(createBoardSchema),
    defaultValues: { name: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (createBoard.isPending) return; // guard double-submit
    setError(null);
    try {
      const board = await createBoard.mutateAsync(values.name);
      onCreated(board.id);
    } catch (err) {
      setError(leadActionErrorMessage(err));
    }
  });

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>New leads board</Modal.Heading>
            </Modal.Header>
            <form onSubmit={onSubmit} noValidate>
              <Modal.Body className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto">
                <p className="text-sm text-foreground/70">
                  Creates a new board pre-seeded with a default pipeline, ready to use right away.
                </p>
                <Controller
                  name="name"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField {...field} isInvalid={fieldState.invalid} autoFocus>
                      <Label>Board name</Label>
                      <Input placeholder="e.g. Corporate sales" />
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
                <Button type="submit" variant="primary" isDisabled={isSubmitting || createBoard.isPending}>
                  {isSubmitting || createBoard.isPending ? "Creating…" : "Create board"}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
