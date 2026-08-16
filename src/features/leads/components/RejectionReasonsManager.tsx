"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Label, TextField } from "@heroui/react";
import { TrashBin } from "@gravity-ui/icons";

import { addRejectionReasonSchema, type AddRejectionReasonFormValues } from "@/features/leads/schema";
import { useSetLeadRejectionReasonsMutation } from "@/features/leads/hooks/useLeadRejectionReasons";
import { leadActionErrorMessage } from "@/features/leads/leadActionError";

/**
 * Minimal CRUD for the workspace's rejection-reason list — embedded in
 * `MarkRejectedDialog` rather than a standalone Settings section, since
 * that's the only place this app gates on it existing (per the brief: "a
 * minimal reason-list manager... since the dialog is unusable without at
 * least one reason existing"). `PUT /lead-rejection-reasons` replaces the
 * whole array (no per-item endpoint), so add/remove each send the full next
 * list.
 */
export function RejectionReasonsManager({ workspaceId, reasons }: { workspaceId: string; reasons: string[] }) {
  const setReasons = useSetLeadRejectionReasonsMutation(workspaceId);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<AddRejectionReasonFormValues>({
    resolver: zodResolver(addRejectionReasonSchema),
    defaultValues: { reason: "" },
  });

  const onAdd = handleSubmit(async (values) => {
    if (setReasons.isPending) return; // guard double-submit
    setError(null);
    const trimmed = values.reason.trim();
    if (reasons.includes(trimmed)) {
      setError("That reason already exists.");
      return;
    }
    try {
      await setReasons.mutateAsync([...reasons, trimmed]);
      reset();
    } catch (err) {
      setError(leadActionErrorMessage(err));
    }
  });

  function handleRemove(reason: string) {
    if (setReasons.isPending) return; // guard double-submit
    setError(null);
    setReasons.mutate(reasons.filter((r) => r !== reason));
  }

  return (
    <div className="rounded-lg border border-black/[0.08] p-3 dark:border-white/[0.12]">
      <p className="mb-2 text-xs font-medium text-foreground/70">Manage rejection reasons</p>
      <ul className="mb-2 flex flex-col gap-1">
        {reasons.map((reason) => (
          <li key={reason} className="flex items-center justify-between gap-2 rounded px-1.5 py-1 text-sm hover:bg-black/[0.03] dark:hover:bg-white/[0.05]">
            <span className="min-w-0 truncate text-foreground">{reason}</span>
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label={`Remove reason "${reason}"`}
              isDisabled={setReasons.isPending}
              onPress={() => handleRemove(reason)}
            >
              <TrashBin className="size-3.5" aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ul>
      <form onSubmit={onAdd} noValidate className="flex items-start gap-2">
        <Controller
          name="reason"
          control={control}
          render={({ field, fieldState }) => (
            <TextField {...field} isInvalid={fieldState.invalid} className="flex-1">
              <Label className="sr-only">New reason</Label>
              <Input placeholder="Add a new reason…" />
            </TextField>
          )}
        />
        <Button type="submit" variant="secondary" size="sm" isDisabled={isSubmitting || setReasons.isPending}>
          Add
        </Button>
      </form>
      {error ? (
        <p role="alert" className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
