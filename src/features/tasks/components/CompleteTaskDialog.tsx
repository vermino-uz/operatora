"use client";

import { useState, type ChangeEvent } from "react";
import { Button, Label, Modal, TextArea, TextField } from "@heroui/react";

import { useCompleteTaskMutation } from "@/features/tasks/hooks/useTaskMutations";
import type { OperatorTask } from "@/features/tasks/types";

/**
 * `PATCH /tasks/:id/complete` — `closure_comment` is server-mandatory
 * (`TasksService.complete()` 400s on empty), matching the old frontend's
 * own dialog behavior exactly (Complete disabled until non-empty).
 */
export function CompleteTaskDialog({ task, onClose }: { task: OperatorTask; onClose: () => void }) {
  const [comment, setComment] = useState("");
  const complete = useCompleteTaskMutation();

  const submit = async () => {
    if (complete.isPending || !comment.trim()) return;
    try {
      await complete.mutateAsync({ id: task.id, closureComment: comment.trim() });
      onClose();
    } catch {
      // error surfaced inline below
    }
  };

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Complete task</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4">
              <p className="text-sm text-foreground/70">{task.title}</p>
              <TextField>
                <Label>Closure comment</Label>
                <TextArea
                  rows={4}
                  value={comment}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setComment(e.target.value)}
                  placeholder="e.g. Called client, rescheduled demo for Friday."
                />
              </TextField>
              {complete.isError ? (
                <p role="alert" className="text-sm text-danger">
                  Couldn&apos;t complete the task. Please try again.
                </p>
              ) : null}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={onClose}>
                Cancel
              </Button>
              <Button variant="primary" isDisabled={!comment.trim() || complete.isPending} onPress={submit}>
                {complete.isPending ? "Completing…" : "Complete"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
