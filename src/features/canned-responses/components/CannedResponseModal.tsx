"use client";

import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, FieldError, Input, Label, Modal, Switch, TextArea, TextField, type UseOverlayStateReturn } from "@heroui/react";

import { ApiError } from "@/types/api";
import { cannedResponseSchema, type CannedResponseFormValues } from "@/features/canned-responses/schema";
import {
  useCreateCannedResponseMutation,
  useUpdateCannedResponseMutation,
} from "@/features/canned-responses/hooks/useCannedResponses";
import { CHANNEL_OPTIONS, formatShortcut, type CannedResponseRow } from "@/features/canned-responses/types";

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return "You don't have permission to manage canned responses.";
    // The db-proxy passes raw Postgres driver errors through unwrapped (no
    // dedicated controller here to translate them) — catch the one
    // predictable case (the `workspace_id + shortcut` unique constraint)
    // with a real message instead of surfacing driver internals, and fall
    // back to a generic message for anything else server-side rather than
    // ever showing a raw SQL error string to the user.
    if (/duplicate key|canned_responses_workspace_shortcut_key/i.test(error.message)) {
      return "That shortcut is already used by another response.";
    }
    if (error.isValidationError) return error.message;
    return "Something went wrong on our end. Please try again shortly.";
  }
  return "Couldn't save this response. Please try again.";
}

export function CannedResponseModal({
  workspaceId,
  userId,
  state,
  editing,
  nextDisplayOrder,
}: {
  workspaceId: string;
  userId: string | null;
  state: UseOverlayStateReturn;
  editing: CannedResponseRow | null;
  nextDisplayOrder: number;
}) {
  const createResponse = useCreateCannedResponseMutation(workspaceId, userId);
  const updateResponse = useUpdateCannedResponseMutation(workspaceId);
  const [error, setError] = useState<string | null>(null);
  const pending = createResponse.isPending || updateResponse.isPending;

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<CannedResponseFormValues>({
    resolver: zodResolver(cannedResponseSchema),
    values: editing
      ? {
          shortcut: editing.shortcut,
          body: editing.body,
          channels: editing.channels?.length ? editing.channels : ["telegram"],
          is_active: editing.is_active,
        }
      : { shortcut: "", body: "", channels: ["telegram"], is_active: true },
  });
  const shortcutValue = useWatch({ control, name: "shortcut" });

  function handleClose() {
    reset();
    setError(null);
    state.close();
  }

  const onSubmit = handleSubmit(async (values) => {
    if (pending) return; // guard double-submit
    setError(null);
    try {
      const input = {
        shortcut: values.shortcut.replace(/^\//, "").trim().toLowerCase(),
        body: values.body.trim(),
        channels: values.channels,
        is_active: values.is_active,
      };
      if (editing) {
        await updateResponse.mutateAsync({ id: editing.id, input });
      } else {
        await createResponse.mutateAsync({ input, nextDisplayOrder });
      }
      handleClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  });

  return (
    <Modal isOpen={state.isOpen} onOpenChange={(open) => (open ? state.setOpen(true) : handleClose())}>
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>{editing ? "Edit canned response" : "New canned response"}</Modal.Heading>
            </Modal.Header>
            <form onSubmit={onSubmit} noValidate>
              <Modal.Body className="flex flex-col gap-4">
                <Controller
                  name="shortcut"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField {...field} isInvalid={fieldState.invalid} isRequired>
                      <Label>Shortcut</Label>
                      <Input placeholder="greeting" />
                      <p className="mt-1 text-xs text-foreground/50">
                        Operators type {formatShortcut(shortcutValue || "greeting")} to insert this message.
                      </p>
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </TextField>
                  )}
                />
                <Controller
                  name="body"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField {...field} isInvalid={fieldState.invalid} isRequired>
                      <Label>Message</Label>
                      <TextArea rows={4} placeholder="Assalomu alaykum! Sizga qanday yordam bera olaman?" />
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </TextField>
                  )}
                />
                <Controller
                  name="channels"
                  control={control}
                  render={({ field, fieldState }) => (
                    <div>
                      <Label>Channels</Label>
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {CHANNEL_OPTIONS.map((ch) => {
                          const selected = field.value.includes(ch.id);
                          return (
                            <button
                              key={ch.id}
                              type="button"
                              disabled={!ch.enabled}
                              onClick={() =>
                                field.onChange(
                                  selected ? field.value.filter((c) => c !== ch.id) : [...field.value, ch.id],
                                )
                              }
                              className={`rounded-lg border px-3 py-1.5 text-sm ${
                                !ch.enabled
                                  ? "cursor-not-allowed border-black/[0.08] text-foreground/30 dark:border-white/[0.1]"
                                  : selected
                                    ? "border-primary bg-primary/5 text-foreground"
                                    : "border-black/[0.12] text-foreground/70 dark:border-white/[0.16]"
                              }`}
                            >
                              {ch.label}
                              {!ch.enabled ? " (soon)" : ""}
                            </button>
                          );
                        })}
                      </div>
                      {fieldState.error ? <p className="mt-1 text-xs text-danger">{fieldState.error.message}</p> : null}
                    </div>
                  )}
                />
                <Controller
                  name="is_active"
                  control={control}
                  render={({ field }) => (
                    <label className="flex items-center justify-between gap-4">
                      <span className="text-sm text-foreground">Active</span>
                      <Switch isSelected={field.value} onChange={field.onChange} aria-label="Active">
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
              </Modal.Body>
              <Modal.Footer>
                <Button type="button" variant="secondary" onPress={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isDisabled={isSubmitting || pending}>
                  {pending ? "Saving…" : "Save"}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
