"use client";

import { Button, Chip, Modal } from "@heroui/react";
import { CircleCheck, Person, Sparkles, Star } from "@gravity-ui/icons";

import { formatLeadName } from "@/features/leads/types";
import { taskTypeLabel, type OperatorTask } from "@/features/tasks/types";

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Read-only detail view — reference: old frontend's `components/tasks/
 * TaskDetailsDialog.tsx`. No "open lead" link (see `TasksPage`'s doc
 * comment); the linked lead's name/phone render as plain text. */
export function TaskDetailsDialog({
  task,
  onClose,
  onComplete,
}: {
  task: OperatorTask;
  onClose: () => void;
  onComplete: (task: OperatorTask) => void;
}) {
  const lead = task.leads;
  const done = task.status === "completed";

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading className="flex items-center gap-2">
                <span className={done ? "line-through opacity-70" : ""}>{task.title}</span>
                {task.source === "manager" ? <Star className="h-3.5 w-3.5 shrink-0 text-warning" aria-label="Manager task" /> : null}
                {task.source === "system" ? <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent" aria-label="System task" /> : null}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Chip size="sm" variant="soft">
                  <Chip.Label>{taskTypeLabel(task.task_type)}</Chip.Label>
                </Chip>
                {done ? (
                  <Chip size="sm" variant="soft" color="success">
                    <Chip.Label className="flex items-center gap-1">
                      <CircleCheck className="h-3 w-3" /> Completed
                    </Chip.Label>
                  </Chip>
                ) : null}
              </div>

              <p className="text-foreground/70">Due: {formatDateTime(task.due_at)}</p>

              {done && task.completed_at ? (
                <p className="text-foreground/70">Completed: {formatDateTime(task.completed_at)}</p>
              ) : null}

              {task.closure_comment ? (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">Closure comment</p>
                  <p className="mt-1 text-foreground">{task.closure_comment}</p>
                </div>
              ) : null}

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">Lead</p>
                {lead ? (
                  <p className="mt-1 flex items-center gap-1 text-foreground">
                    <Person className="h-3.5 w-3.5 shrink-0" />
                    {formatLeadName(lead)}
                    {lead.phone_number ? <span className="text-foreground/60"> · {lead.phone_number}</span> : null}
                  </p>
                ) : (
                  <p className="mt-1 text-foreground/60">No lead linked</p>
                )}
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={onClose}>
                Close
              </Button>
              {!done ? (
                <Button
                  variant="primary"
                  onPress={() => {
                    onClose();
                    onComplete(task);
                  }}
                >
                  Complete
                </Button>
              ) : null}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
