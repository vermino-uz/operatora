"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, FieldError, Input, Label, Modal, NumberField, TextArea, TextField, type UseOverlayStateReturn } from "@heroui/react";
import { FieldError as PlainFieldError } from "@/features/finance/components/RhfFieldError";

import { ApiError } from "@/types/api";
import { courseEditorSchema, type CourseEditorValues } from "@/features/finance/schema";
import { useCreateCourseMutation, useUpdateCourseMutation } from "@/features/finance/hooks/useFinance";
import type { CourseRow } from "@/features/finance/types";

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return "You don't have permission to manage courses.";
    if (error.isValidationError) return error.message;
    return "Something went wrong on our end. Please try again shortly.";
  }
  return "Couldn't save this course. Please try again.";
}

function defaultValues(editing: CourseRow | null): CourseEditorValues {
  if (!editing) return { name: "", description: "", monthly_tuition: 0, is_active: true };
  return {
    name: editing.name,
    description: editing.description ?? "",
    monthly_tuition: editing.monthly_tuition,
    is_active: editing.is_active,
  };
}

export function CourseEditorModal({
  workspaceId,
  createdBy,
  state,
  editing,
}: {
  workspaceId: string;
  createdBy: string | null;
  state: UseOverlayStateReturn;
  editing: CourseRow | null;
}) {
  const createMutation = useCreateCourseMutation(workspaceId);
  const updateMutation = useUpdateCourseMutation(workspaceId);
  const pending = createMutation.isPending || updateMutation.isPending;

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<CourseEditorValues>({ resolver: zodResolver(courseEditorSchema), values: defaultValues(editing) });

  function handleClose() {
    reset();
    state.close();
  }

  const onSubmit = handleSubmit(async (values) => {
    if (pending) return;
    try {
      const input = {
        name: values.name,
        description: values.description || null,
        monthly_tuition: values.monthly_tuition,
        is_active: values.is_active,
      };
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, input });
      } else {
        await createMutation.mutateAsync({ ...input, created_by: createdBy });
      }
      handleClose();
    } catch {
      // surfaced below via mutation.error
    }
  });

  const submitError = createMutation.error ?? updateMutation.error;

  return (
    <Modal isOpen={state.isOpen} onOpenChange={(open) => (open ? state.setOpen(true) : handleClose())}>
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>{editing ? "Edit course" : "New course"}</Modal.Heading>
            </Modal.Header>
            <form onSubmit={onSubmit} noValidate>
              <Modal.Body className="flex flex-col gap-4">
                <Controller
                  name="name"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField {...field} isInvalid={fieldState.invalid} isRequired>
                      <Label>Name</Label>
                      <Input placeholder="English intensive" />
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </TextField>
                  )}
                />
                <Controller
                  name="description"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField {...field} isInvalid={fieldState.invalid}>
                      <Label>Description</Label>
                      <TextArea rows={2} placeholder="Optional notes about this course" />
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </TextField>
                  )}
                />
                <Controller
                  name="monthly_tuition"
                  control={control}
                  render={({ field, fieldState }) => (
                    <div>
                      <Label>Monthly tuition (UZS)</Label>
                      <NumberField
                        aria-label="Monthly tuition"
                        minValue={0}
                        value={field.value}
                        onChange={(v) => field.onChange(v ?? 0)}
                        onBlur={field.onBlur}
                        isInvalid={fieldState.invalid}
                        className="mt-1 w-full"
                      >
                        <NumberField.Group>
                          <NumberField.Input />
                        </NumberField.Group>
                      </NumberField>
                      <PlainFieldError>{fieldState.error?.message}</PlainFieldError>
                    </div>
                  )}
                />
                <Controller
                  name="is_active"
                  control={control}
                  render={({ field }) => (
                    <label className="flex items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="size-4 rounded-md accent-primary"
                      />
                      Active
                    </label>
                  )}
                />
                {submitError ? (
                  <p role="alert" className="text-sm text-danger">
                    {errorMessage(submitError)}
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
