"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Label, Modal, Switch, TextArea, TextField } from "@heroui/react";
import { ArrowDown, ArrowUp, Pencil, Plus, TrashBin } from "@gravity-ui/icons";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { IconButton } from "@/components/ui/IconButton";
import { columnFormSchema, type ColumnFormValues } from "@/features/leads/schema";
import {
  useBoardColumnsManageQuery,
  useCreateColumnMutation,
  useDeleteColumnMutation,
  useReorderColumnMutation,
  useUpdateColumnMutation,
} from "@/features/leads/hooks/useColumnManagement";
import { leadActionErrorMessage } from "@/features/leads/leadActionError";
import type { LeadBoardColumn } from "@/features/leads/types";

const DEFAULT_COLUMN_COLOR = "#3b82f6";

function toFormValues(column?: LeadBoardColumn): ColumnFormValues {
  return {
    name: column?.name ?? "",
    color: column?.color ?? DEFAULT_COLUMN_COLOR,
    description: column?.description ?? "",
    is_hidden: Boolean(column?.is_hidden),
    lead_limit: column?.lead_limit != null ? String(column.lead_limit) : "",
  };
}

/**
 * Column CRUD + WIP limits (Phase 2c-5, item 1+2). Manageable columns only —
 * the two locked Sold/Rejected marker columns (`special_stage_kind` set)
 * never get edit/delete/reorder affordances here (the backend rejects all
 * three server-side anyway, see `columnsApi`'s doc comments; hiding them
 * avoids a request that's guaranteed to fail). The board's `is_default`
 * seeded columns ARE editable (rename/color/limit/hide) but never
 * deletable, matching `ColumnsService.remove()`'s own rule exactly — the
 * delete button is disabled with a tooltip for those instead of a
 * round-trip 400.
 */
export function ManageColumnsDialog({ boardId, onClose }: { boardId: string; onClose: () => void }) {
  const columnsQuery = useBoardColumnsManageQuery(boardId);
  const createColumn = useCreateColumnMutation(boardId);
  const updateColumn = useUpdateColumnMutation(boardId);
  const deleteColumn = useDeleteColumnMutation(boardId);
  const reorderColumn = useReorderColumnMutation(boardId);

  const [editing, setEditing] = useState<{ mode: "create" } | { mode: "edit"; column: LeadBoardColumn } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ColumnFormValues>({
    resolver: zodResolver(columnFormSchema),
    defaultValues: toFormValues(),
  });

  function openCreate() {
    setError(null);
    reset(toFormValues());
    setEditing({ mode: "create" });
  }

  function openEdit(column: LeadBoardColumn) {
    setError(null);
    reset(toFormValues(column));
    setEditing({ mode: "edit", column });
  }

  const onSubmit = handleSubmit(async (values) => {
    if (createColumn.isPending || updateColumn.isPending) return; // guard double-submit
    setError(null);
    const payload = {
      name: values.name,
      color: values.color,
      description: values.description?.trim() ? values.description.trim() : undefined,
      is_hidden: values.is_hidden,
      lead_limit: values.lead_limit.trim() ? Number(values.lead_limit) : null,
    };
    try {
      if (editing?.mode === "edit") {
        await updateColumn.mutateAsync({ columnId: editing.column.id, payload });
      } else {
        await createColumn.mutateAsync(payload);
      }
      setEditing(null);
    } catch (err) {
      setError(leadActionErrorMessage(err));
    }
  });

  async function handleDelete(column: LeadBoardColumn) {
    if (deletingId) return; // guard double-submit
    if (!window.confirm(`Delete the "${column.name}" column? This can't be undone.`)) return;
    setError(null);
    setDeletingId(column.id);
    try {
      await deleteColumn.mutateAsync(column.id);
    } catch (err) {
      setError(leadActionErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  }

  const columns = (columnsQuery.data ?? []).slice().sort((a, b) => a.display_order - b.display_order);
  const manageable = columns.filter((c) => !c.special_stage_kind);

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Manage pipeline columns</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto">
              {columnsQuery.isLoading ? (
                <LoadingState label="Loading columns…" />
              ) : columnsQuery.isError ? (
                <ErrorState error={columnsQuery.error} onRetry={() => columnsQuery.refetch()} />
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {manageable.map((column, index) => (
                    <li
                      key={column.id}
                      className="flex items-center gap-2 rounded-lg border border-black/[0.08] px-3 py-2 dark:border-white/[0.12]"
                    >
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: column.color ?? DEFAULT_COLUMN_COLOR }}
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {column.name}
                          {column.is_default ? <span className="ml-1.5 text-xs text-foreground/40">(default)</span> : null}
                          {column.is_hidden ? <span className="ml-1.5 text-xs text-foreground/40">(hidden)</span> : null}
                        </p>
                        {column.lead_limit != null ? (
                          <p className="text-xs text-foreground/50">WIP limit: {column.lead_limit}</p>
                        ) : null}
                      </div>

                      <Button
                        isIconOnly
                        size="sm"
                        variant="ghost"
                        aria-label="Move up"
                        isDisabled={index === 0 || reorderColumn.isPending}
                        onPress={() => reorderColumn.mutate({ columnId: column.id, direction: "up" })}
                      >
                        <ArrowUp className="size-3.5" aria-hidden="true" />
                      </Button>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="ghost"
                        aria-label="Move down"
                        isDisabled={index === manageable.length - 1 || reorderColumn.isPending}
                        onPress={() => reorderColumn.mutate({ columnId: column.id, direction: "down" })}
                      >
                        <ArrowDown className="size-3.5" aria-hidden="true" />
                      </Button>
                      <Button isIconOnly size="sm" variant="ghost" aria-label={`Edit ${column.name}`} onPress={() => openEdit(column)}>
                        <Pencil className="size-3.5" aria-hidden="true" />
                      </Button>
                      <IconButton
                        label={`Delete ${column.name}`}
                        tooltip={column.is_default ? "The default stage can't be deleted" : "Delete"}
                        size="sm"
                        variant="ghost"
                        isDisabled={Boolean(column.is_default) || deletingId === column.id}
                        onPress={() => void handleDelete(column)}
                      >
                        <TrashBin className="size-3.5" aria-hidden="true" />
                      </IconButton>
                    </li>
                  ))}
                  {manageable.length === 0 ? <p className="py-4 text-center text-sm text-foreground/50">No columns yet.</p> : null}
                </ul>
              )}

              {editing ? (
                <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3 rounded-lg border border-black/[0.08] p-3 dark:border-white/[0.12]">
                  <p className="text-xs font-medium text-foreground/70">
                    {editing.mode === "edit" ? `Edit "${editing.column.name}"` : "New column"}
                  </p>
                  <div className="flex items-end gap-3">
                    <Controller
                      name="color"
                      control={control}
                      render={({ field }) => (
                        <label className="flex flex-col gap-1 text-xs text-foreground/50">
                          Color
                          <input
                            type="color"
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                            className="h-9 w-9 cursor-pointer rounded border border-black/[0.08] dark:border-white/[0.12]"
                          />
                        </label>
                      )}
                    />
                    <Controller
                      name="name"
                      control={control}
                      render={({ field, fieldState }) => (
                        <TextField {...field} isInvalid={fieldState.invalid} className="flex-1">
                          <Label>Name</Label>
                          <Input placeholder="e.g. Qualified" />
                        </TextField>
                      )}
                    />
                    <Controller
                      name="lead_limit"
                      control={control}
                      render={({ field, fieldState }) => (
                        <TextField {...field} isInvalid={fieldState.invalid} className="w-32">
                          <Label>WIP limit</Label>
                          <Input placeholder="Unlimited" inputMode="numeric" />
                        </TextField>
                      )}
                    />
                  </div>

                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field}>
                        <Label>Description (optional)</Label>
                        <TextArea rows={2} placeholder="What does this stage mean?" />
                      </TextField>
                    )}
                  />

                  <Controller
                    name="is_hidden"
                    control={control}
                    render={({ field }) => (
                      <label className="flex items-center justify-between gap-4">
                        <span className="text-sm text-foreground/70">Hidden from the board</span>
                        <Switch isSelected={field.value} onChange={field.onChange} aria-label="Hidden from the board">
                          <Switch.Content>
                            <Switch.Control>
                              <Switch.Thumb />
                            </Switch.Control>
                          </Switch.Content>
                        </Switch>
                      </label>
                    )}
                  />

                  {error ? (
                    <p role="alert" className="text-sm text-danger">
                      {error}
                    </p>
                  ) : null}

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" size="sm" onPress={() => setEditing(null)}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" size="sm" isDisabled={isSubmitting || createColumn.isPending || updateColumn.isPending}>
                      {isSubmitting || createColumn.isPending || updateColumn.isPending ? "Saving…" : "Save"}
                    </Button>
                  </div>
                </form>
              ) : (
                <Button variant="secondary" size="sm" className="w-fit" onPress={openCreate}>
                  <Plus className="size-3.5" aria-hidden="true" />
                  Add column
                </Button>
              )}

              {!editing && error ? (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              ) : null}
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
