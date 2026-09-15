"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, FieldError, Input, Label, ListBox, Modal, NumberField, Select, TextField, type UseOverlayStateReturn } from "@heroui/react";

import { ApiError } from "@/types/api";
import { FieldError as PlainFieldError } from "@/features/finance/components/RhfFieldError";
import { groupEditorSchema, type GroupEditorValues } from "@/features/finance/schema";
import { useCreateGroupMutation, useUpdateGroupMutation } from "@/features/finance/hooks/useFinance";
import type { CourseRow, GroupRow } from "@/features/finance/types";

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return "You don't have permission to manage groups.";
    if (error.isValidationError) return error.message;
    return "Something went wrong on our end. Please try again shortly.";
  }
  return "Couldn't save this group. Please try again.";
}

function defaultValues(editing: GroupRow | null, firstCourseId: string): GroupEditorValues {
  if (!editing) return { name: "", course_id: firstCourseId, monthly_due_day: 1, current_month: 1, is_active: true };
  return {
    name: editing.name,
    course_id: editing.course_id,
    monthly_due_day: editing.monthly_due_day,
    current_month: editing.current_month,
    is_active: editing.is_active,
  };
}

export function GroupEditorModal({
  workspaceId,
  createdBy,
  courses,
  state,
  editing,
}: {
  workspaceId: string;
  createdBy: string | null;
  courses: CourseRow[];
  state: UseOverlayStateReturn;
  editing: GroupRow | null;
}) {
  const createMutation = useCreateGroupMutation(workspaceId);
  const updateMutation = useUpdateGroupMutation(workspaceId);
  const pending = createMutation.isPending || updateMutation.isPending;

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<GroupEditorValues>({
    resolver: zodResolver(groupEditorSchema),
    values: defaultValues(editing, courses[0]?.id ?? ""),
  });

  function handleClose() {
    reset();
    state.close();
  }

  const onSubmit = handleSubmit(async (values) => {
    if (pending) return;
    try {
      const input = {
        name: values.name,
        course_id: values.course_id,
        monthly_due_day: values.monthly_due_day,
        current_month: values.current_month,
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
  const courseOptions = courses.map((c) => ({ id: c.id, label: c.name }));

  return (
    <Modal isOpen={state.isOpen} onOpenChange={(open) => (open ? state.setOpen(true) : handleClose())}>
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>{editing ? "Edit group" : "New group"}</Modal.Heading>
            </Modal.Header>
            <form onSubmit={onSubmit} noValidate>
              <Modal.Body className="flex flex-col gap-4">
                <Controller
                  name="name"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField {...field} isInvalid={fieldState.invalid} isRequired>
                      <Label>Name</Label>
                      <Input placeholder="Evening group A" />
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </TextField>
                  )}
                />
                <Controller
                  name="course_id"
                  control={control}
                  render={({ field, fieldState }) => (
                    <div>
                      <Label>Course</Label>
                      {courseOptions.length === 0 ? (
                        <p className="mt-1 text-xs text-foreground/60">Create a course first, under the Courses tab.</p>
                      ) : (
                        <Select
                          aria-label="Course"
                          value={field.value}
                          onChange={(key) => typeof key === "string" && field.onChange(key)}
                          className="mt-1 w-full"
                          isInvalid={fieldState.invalid}
                        >
                          <Select.Trigger>
                            <Select.Value />
                            <Select.Indicator />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox items={courseOptions}>
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
                      <PlainFieldError>{fieldState.error?.message}</PlainFieldError>
                    </div>
                  )}
                />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Controller
                    name="monthly_due_day"
                    control={control}
                    render={({ field, fieldState }) => (
                      <div>
                        <Label>Monthly due day</Label>
                        <NumberField
                          aria-label="Monthly due day"
                          minValue={1}
                          maxValue={28}
                          value={field.value}
                          onChange={(v) => field.onChange(v ?? 1)}
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
                    name="current_month"
                    control={control}
                    render={({ field, fieldState }) => (
                      <div>
                        <Label>Current month #</Label>
                        <NumberField
                          aria-label="Current month number"
                          minValue={1}
                          value={field.value}
                          onChange={(v) => field.onChange(v ?? 1)}
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
                </div>
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
                <Button type="submit" variant="primary" isDisabled={isSubmitting || pending || courseOptions.length === 0}>
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
