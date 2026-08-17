"use client";

import { Button, Chip } from "@heroui/react";
import { Calendar, Person, Sparkles, Star } from "@gravity-ui/icons";

import { formatLeadName } from "@/features/leads/types";
import { bucketTask, taskTypeLabel, type OperatorTask } from "@/features/tasks/types";

function sourceBadge(source: string): { label: string; color: "warning" | "accent" | "default" } {
  if (source === "manager") return { label: "Manager", color: "warning" };
  if (source === "system") return { label: "System", color: "accent" };
  return { label: "Operator", color: "default" };
}

function formatDue(dueAt: string): string {
  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * A single task row — reference: old frontend's `components/tasks/
 * TaskRow.tsx`, rebuilt on this app's own component conventions (no
 * clickable "open lead" affordance, see `TasksPage`'s doc comment on why
 * the lead reference here is plain text, not a link).
 */
export function TaskRow({
  task,
  onComplete,
  onOpenDetails,
}: {
  task: OperatorTask;
  onComplete: (task: OperatorTask) => void;
  onOpenDetails: (task: OperatorTask) => void;
}) {
  const lead = task.leads;
  const bucket = bucketTask(task);
  const overdue = task.is_overdue || bucket === "overdue";
  const done = task.status === "completed";
  const badge = sourceBadge(task.source);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenDetails(task)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenDetails(task);
        }
      }}
      className={`flex w-full cursor-pointer items-start gap-3 rounded-xl border border-black/[0.08] px-4 py-3 text-left transition-colors hover:bg-black/[0.02] dark:border-white/[0.12] dark:hover:bg-white/[0.04] ${
        overdue && !done ? "border-l-4 border-l-danger" : done ? "border-l-4 border-l-default-300" : "border-l-4 border-l-transparent"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-sm font-semibold text-foreground ${done ? "line-through opacity-70" : ""}`}>
            {task.title}
          </span>
          {task.source === "manager" ? <Star className="h-3.5 w-3.5 shrink-0 text-warning" aria-label="Manager task" /> : null}
          {task.source === "system" ? <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent" aria-label="System task" /> : null}
          <Chip size="sm" variant="soft">
            <Chip.Label>{taskTypeLabel(task.task_type)}</Chip.Label>
          </Chip>
          <Chip size="sm" variant="soft" color={badge.color}>
            <Chip.Label>{badge.label}</Chip.Label>
          </Chip>
        </div>
        {lead ? (
          <p className="mt-1 flex items-center gap-1 text-xs text-foreground/70">
            <Person className="h-3.5 w-3.5 shrink-0" />
            {formatLeadName(lead)}
          </p>
        ) : null}
        <p className="mt-1 flex items-center gap-1 text-xs text-foreground/60">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          {formatDue(task.due_at)}
        </p>
      </div>
      {task.status === "pending" ? (
        <Button
          size="sm"
          variant="primary"
          onPress={(e) => {
            (e as unknown as { stopPropagation?: () => void }).stopPropagation?.();
            onComplete(task);
          }}
        >
          Complete
        </Button>
      ) : null}
    </div>
  );
}
