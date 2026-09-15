"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  FieldError,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  TextArea,
  TextField,
  type UseOverlayStateReturn,
} from "@heroui/react";

import { ApiError } from "@/types/api";
import { instructionSchema, type InstructionFormValues } from "@/features/instructions/schema";
import { INSTRUCTION_CATEGORIES, INSTRUCTION_PRIORITIES, type InstructionRow } from "@/features/instructions/types";
import {
  useCreateInstructionMutation,
  useUpdateInstructionMutation,
} from "@/features/instructions/hooks/useInstructions";

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return "You don't have permission to manage instructions.";
    if (error.isValidationError) return error.message;
    return "Something went wrong on our end. Please try again shortly.";
  }
  return "Couldn't save this instruction. Please try again.";
}

function toCsv(list: string[]): string {
  return list.join(", ");
}

function fromCsv(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function InstructionFormModal({
  workspaceId,
  createdBy,
  state,
  editing,
  nextDisplayOrder,
}: {
  workspaceId: string;
  createdBy: string | null;
  state: UseOverlayStateReturn;
  editing: InstructionRow | null;
  nextDisplayOrder: number;
}) {
  const createMutation = useCreateInstructionMutation(workspaceId);
  const updateMutation = useUpdateInstructionMutation(workspaceId);
  const [error, setError] = useState<string | null>(null);
  const pending = createMutation.isPending || updateMutation.isPending;

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<InstructionFormValues>({
    resolver: zodResolver(instructionSchema),
    values: editing
      ? {
          title: editing.title,
          category: (INSTRUCTION_CATEGORIES as readonly string[]).includes(editing.category)
            ? (editing.category as InstructionFormValues["category"])
            : "Sales Techniques",
          priority: (INSTRUCTION_PRIORITIES as readonly string[]).includes(editing.priority)
            ? (editing.priority as InstructionFormValues["priority"])
            : "medium",
          target_operators: toCsv(editing.target_operators ?? []),
          tags: toCsv(editing.tags ?? []),
          content: editing.content,
        }
      : {
          title: "",
          category: "Sales Techniques",
          priority: "medium",
          target_operators: "",
          tags: "",
          content: "",
        },
  });

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
        title: values.title,
        category: values.category,
        priority: values.priority,
        target_operators: fromCsv(values.target_operators),
        tags: fromCsv(values.tags),
        content: values.content,
        created_by: createdBy,
      };
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, input });
      } else {
        await createMutation.mutateAsync({ input, displayOrder: nextDisplayOrder });
      }
      handleClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  });

  return (
    <Modal isOpen={state.isOpen} onOpenChange={(open) => (open ? state.setOpen(true) : handleClose())}>
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>{editing ? "Edit instruction" : "New instruction"}</Modal.Heading>
            </Modal.Header>
            <form onSubmit={onSubmit} noValidate>
              <Modal.Body className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Controller
                    name="title"
                    control={control}
                    render={({ field, fieldState }) => (
                      <TextField {...field} isInvalid={fieldState.invalid} isRequired className="md:col-span-2">
                        <Label>Title</Label>
                        <Input placeholder="Handling price objections" />
                        <FieldError>{fieldState.error?.message}</FieldError>
                      </TextField>
                    )}
                  />
                  <Controller
                    name="category"
                    control={control}
                    render={({ field, fieldState }) => (
                      <div>
                        <Label>Category</Label>
                        <Select
                          aria-label="Category"
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
                            <ListBox items={INSTRUCTION_CATEGORIES.map((c) => ({ id: c, label: c }))}>
                              {(opt) => (
                                <ListBox.Item id={opt.id} textValue={opt.label}>
                                  {opt.label}
                                  <ListBox.ItemIndicator />
                                </ListBox.Item>
                              )}
                            </ListBox>
                          </Select.Popover>
                        </Select>
                        {fieldState.error ? <p className="mt-1 text-xs text-danger">{fieldState.error.message}</p> : null}
                      </div>
                    )}
                  />
                  <Controller
                    name="priority"
                    control={control}
                    render={({ field, fieldState }) => (
                      <div>
                        <Label>Priority</Label>
                        <Select
                          aria-label="Priority"
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
                            <ListBox items={INSTRUCTION_PRIORITIES.map((p) => ({ id: p, label: p }))}>
                              {(opt) => (
                                <ListBox.Item id={opt.id} textValue={opt.label}>
                                  <span className="capitalize">{opt.label}</span>
                                  <ListBox.ItemIndicator />
                                </ListBox.Item>
                              )}
                            </ListBox>
                          </Select.Popover>
                        </Select>
                        {fieldState.error ? <p className="mt-1 text-xs text-danger">{fieldState.error.message}</p> : null}
                      </div>
                    )}
                  />
                </div>

                <Controller
                  name="target_operators"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField {...field} isInvalid={fieldState.invalid}>
                      <Label>Target operators</Label>
                      <Input placeholder="Ali, Bekzod (comma-separated)" />
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </TextField>
                  )}
                />

                <Controller
                  name="tags"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField {...field} isInvalid={fieldState.invalid}>
                      <Label>Tags</Label>
                      <Input placeholder="objections, pricing (comma-separated)" />
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </TextField>
                  )}
                />

                <Controller
                  name="content"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField {...field} isInvalid={fieldState.invalid} isRequired>
                      <Label>Content</Label>
                      <TextArea rows={8} placeholder="Write the instruction operators should follow…" />
                      <FieldError>{fieldState.error?.message}</FieldError>
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
