"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Label, ListBox, Select, TextField, Input } from "@heroui/react";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { useLeadTaskAssigneesQuery, useLeadTaskMutations, useLeadTasksQuery } from "@/features/leads/hooks/useLeadTasks";
import { LEAD_TASK_TYPES, leadTaskCompleteSchema, leadTaskSchema, type LeadTaskCompleteFormValues, type LeadTaskFormValues } from "@/features/leads/schema";
import { leadActionErrorMessage } from "@/features/leads/leadActionError";

const TASK_TYPE_LABELS: Record<string, string> = {
  call: "Call",
  send_info: "Send info",
  meeting: "Meeting",
  check_payment: "Check payment",
  custom: "Custom",
  system: "System",
};

/**
 * `tasks.controller.ts` — full task history for this lead (any assignee,
 * any status), plus an inline "add task" form. Creating a task assigned to
 * someone other than yourself requires a manager role server-side
 * (`TasksService.create()`) — surfaced as a normal inline error, not
 * pre-blocked client-side.
 */
export function LeadTasksTab({ leadId, isActive }: { leadId: string; isActive: boolean }) {
  const tasksQuery = useLeadTasksQuery(leadId, isActive);
  const assigneesQuery = useLeadTaskAssigneesQuery(isActive);
  const { create, complete } = useLeadTaskMutations(leadId);
  const [error, setError] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<LeadTaskFormValues>({
    resolver: zodResolver(leadTaskSchema),
    defaultValues: { title: "", task_type: "call", due_at: "", assigned_operator_id: "" },
  });

  const {
    control: completeControl,
    handleSubmit: handleCompleteSubmit,
    reset: resetComplete,
    formState: { isSubmitting: isCompleteSubmitting },
  } = useForm<LeadTaskCompleteFormValues>({
    resolver: zodResolver(leadTaskCompleteSchema),
    defaultValues: { closure_comment: "" },
  });

  const onCreate = handleSubmit(async (values) => {
    if (create.isPending) return;
    setError(null);
    try {
      await create.mutateAsync({
        title: values.title,
        task_type: values.task_type,
        due_at: new Date(values.due_at).toISOString(),
        assigned_operator_id: values.assigned_operator_id || null,
      });
      reset({ title: "", task_type: "call", due_at: "", assigned_operator_id: "" });
    } catch (err) {
      setError(leadActionErrorMessage(err));
    }
  });

  const onComplete = handleCompleteSubmit(async (values) => {
    if (!completingId || complete.isPending) return;
    setError(null);
    try {
      await complete.mutateAsync({ taskId: completingId, closureComment: values.closure_comment });
      setCompletingId(null);
      resetComplete({ closure_comment: "" });
    } catch (err) {
      setError(leadActionErrorMessage(err));
    }
  });

  if (tasksQuery.isLoading) return <LoadingState label="Loading tasks…" />;
  if (tasksQuery.isError) return <ErrorState error={tasksQuery.error} onRetry={() => tasksQuery.refetch()} />;
  const tasks = tasksQuery.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={onCreate} noValidate className="flex flex-col gap-2 rounded-lg border border-border p-3">
        <Controller
          name="title"
          control={control}
          render={({ field, fieldState }) => (
            <TextField {...field} isInvalid={fieldState.invalid}>
              <Label>Title</Label>
              <Input placeholder="e.g. Call back about pricing" />
              {fieldState.error ? <p className="mt-1 text-xs text-danger">{fieldState.error.message}</p> : null}
            </TextField>
          )}
        />
        <div className="grid grid-cols-2 gap-2">
          <Controller
            name="task_type"
            control={control}
            render={({ field }) => (
              <Select aria-label="Task type" value={field.value} onChange={(k) => typeof k === "string" && field.onChange(k)}>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox items={LEAD_TASK_TYPES.map((t) => ({ id: t, label: TASK_TYPE_LABELS[t] ?? t }))}>
                    {(opt) => (
                      <ListBox.Item id={opt.id} textValue={opt.label}>
                        {opt.label}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    )}
                  </ListBox>
                </Select.Popover>
              </Select>
            )}
          />
          <Controller
            name="due_at"
            control={control}
            render={({ field, fieldState }) => (
              <div>
                <input
                  type="datetime-local"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  aria-label="Due date"
                  className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                />
                {fieldState.error ? <p className="mt-1 text-xs text-danger">{fieldState.error.message}</p> : null}
              </div>
            )}
          />
        </div>
        <Controller
          name="assigned_operator_id"
          control={control}
          render={({ field }) => (
            <Select
              aria-label="Assignee"
              value={field.value || "me"}
              onChange={(k) => typeof k === "string" && field.onChange(k === "me" ? "" : k)}
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox
                  items={[
                    { id: "me", label: "Myself" },
                    ...(assigneesQuery.data ?? []).map((op) => ({ id: op.id, label: op.operator_name })),
                  ]}
                >
                  {(opt) => (
                    <ListBox.Item id={opt.id} textValue={opt.label}>
                      {opt.label}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  )}
                </ListBox>
              </Select.Popover>
            </Select>
          )}
        />
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="sm" variant="primary" isDisabled={isSubmitting || create.isPending} className="self-end">
          {isSubmitting || create.isPending ? "Adding…" : "Add task"}
        </Button>
      </form>

      {tasks.length === 0 ? <EmptyState title="No tasks for this lead yet" /> : null}

      <ul className="flex flex-col gap-2">
        {tasks.map((task) => (
          <li key={task.id} className="rounded-lg border border-border p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-foreground">{task.title}</span>
              <span
                className={`text-xs font-medium capitalize ${
                  task.status === "completed"
                    ? "text-success"
                    : task.is_overdue
                      ? "text-danger"
                      : "text-foreground/50"
                }`}
              >
                {task.status === "pending" && task.is_overdue ? "overdue" : task.status}
              </span>
            </div>
            <p className="text-xs text-foreground/50">
              {TASK_TYPE_LABELS[task.task_type] ?? task.task_type} · due {new Date(task.due_at).toLocaleString()}
            </p>
            {task.closure_comment ? <p className="mt-1 text-xs text-foreground/70">{task.closure_comment}</p> : null}

            {task.status === "pending" ? (
              completingId === task.id ? (
                <form onSubmit={onComplete} noValidate className="mt-2 flex items-end gap-2">
                  <Controller
                    name="closure_comment"
                    control={completeControl}
                    render={({ field, fieldState }) => (
                      <TextField {...field} isInvalid={fieldState.invalid} className="flex-1">
                        <Label className="sr-only">Closing note</Label>
                        <Input placeholder="How was it resolved?" />
                      </TextField>
                    )}
                  />
                  <Button type="submit" size="sm" variant="primary" isDisabled={isCompleteSubmitting || complete.isPending}>
                    {complete.isPending ? "Saving…" : "Save"}
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onPress={() => setCompletingId(null)}>
                    Cancel
                  </Button>
                </form>
              ) : (
                <Button size="sm" variant="secondary" className="mt-2" onPress={() => setCompletingId(task.id)}>
                  Mark complete
                </Button>
              )
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
