"use client";

import { useEffect } from "react";
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
  type Control,
  type UseFormGetValues,
  type UseFormSetValue,
} from "react-hook-form";
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
import { Plus, TrashBin } from "@gravity-ui/icons";

import { ApiError } from "@/types/api";
import { formEditorSchema, blankFormField, leadFormFieldPresets, type FormEditorValues } from "@/features/forms/schema";
import { FORM_FIELD_TYPES, type FormRow } from "@/features/forms/types";
import { useCreateFormMutation, useUpdateFormMutation } from "@/features/forms/hooks/useForms";

const TYPE_OPTIONS = [
  { id: "general", label: "General" },
  { id: "leads", label: "Leads (auto-creates a lead per submission)" },
];
const STATUS_OPTIONS = [
  { id: "draft", label: "Draft" },
  { id: "published", label: "Published" },
];
const FIELD_TYPE_OPTIONS = FORM_FIELD_TYPES.map((t) => ({ id: t, label: t }));

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return "You don't have permission to manage forms.";
    if (error.isValidationError) return error.message;
    return "Something went wrong on our end. Please try again shortly.";
  }
  return "Couldn't save this form. Please try again.";
}

function defaultValues(editing: FormRow | null): FormEditorValues {
  if (!editing) {
    return { name: "", description: "", type: "general", status: "draft", thank_you_message: "", fields: [] };
  }
  return {
    name: editing.name,
    description: editing.description ?? "",
    type: editing.type === "leads" ? "leads" : "general",
    status: editing.status === "published" ? "published" : "draft",
    thank_you_message: editing.thank_you_message ?? "",
    fields: editing.fields.map((f) => ({
      id: f.id,
      name: f.name,
      label: f.label,
      type: f.type,
      required: f.required,
      placeholder: f.placeholder ?? "",
      options: f.options ?? [],
    })),
  };
}

export function FormEditorModal({
  workspaceId,
  createdBy,
  state,
  editing,
}: {
  workspaceId: string;
  createdBy: string | null;
  state: UseOverlayStateReturn;
  editing: FormRow | null;
}) {
  const createMutation = useCreateFormMutation(workspaceId);
  const updateMutation = useUpdateFormMutation(workspaceId);
  const pending = createMutation.isPending || updateMutation.isPending;

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormEditorValues>({
    resolver: zodResolver(formEditorSchema),
    values: defaultValues(editing),
  });

  const { fields, append, remove } = useFieldArray({ control, name: "fields" });
  const type = useWatch({ control, name: "type" });

  // Mirror the old `CreateFormDialog`'s behavior: switching to "leads" with
  // no fields yet auto-populates the lead-intake preset.
  useEffect(() => {
    if (!state.isOpen) return;
    if (type === "leads" && fields.length === 0) {
      leadFormFieldPresets().forEach((f) => append(f));
    }
  }, [type, fields.length, append, state.isOpen]);

  function handleClose() {
    reset();
    state.close();
  }

  const onSubmit = handleSubmit(async (values) => {
    if (pending) return; // guard double-submit
    try {
      const fieldsPayload = values.fields.map((f) => ({
        id: f.id,
        name: f.name,
        label: f.label,
        type: f.type as FormEditorValues["fields"][number]["type"],
        required: f.required,
        placeholder: f.placeholder || undefined,
        options: f.type === "select" ? (f.options ?? []).filter((o) => o.trim().length > 0) : undefined,
      })) as FormRow["fields"];

      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          input: {
            name: values.name,
            description: values.description || null,
            type: values.type,
            status: values.status,
            thank_you_message: values.thank_you_message || null,
            fields: fieldsPayload,
          },
        });
      } else {
        await createMutation.mutateAsync({
          name: values.name,
          description: values.description || null,
          type: values.type,
          status: values.status,
          thank_you_message: values.thank_you_message || null,
          fields: fieldsPayload,
          created_by: createdBy,
        });
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
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>{editing ? "Edit form" : "New form"}</Modal.Heading>
            </Modal.Header>
            <form onSubmit={onSubmit} noValidate>
              <Modal.Body className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Controller
                    name="name"
                    control={control}
                    render={({ field, fieldState }) => (
                      <TextField {...field} isInvalid={fieldState.invalid} isRequired>
                        <Label>Name</Label>
                        <Input placeholder="Contact form" />
                        <FieldError>{fieldState.error?.message}</FieldError>
                      </TextField>
                    )}
                  />
                  <Controller
                    name="type"
                    control={control}
                    render={({ field, fieldState }) => (
                      <div>
                        <Label>Type</Label>
                        <Select
                          aria-label="Type"
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
                            <ListBox items={TYPE_OPTIONS}>
                              {(opt) => (
                                <ListBox.Item id={opt.id} textValue={opt.label}>
                                  {opt.label}
                                  <ListBox.ItemIndicator />
                                </ListBox.Item>
                              )}
                            </ListBox>
                          </Select.Popover>
                        </Select>
                        <p className="mt-1 text-xs text-foreground/60">
                          Leads forms auto-create a lead from every submission (once the backend submit route ships — see
                          `publicFormTypes.ts`).
                        </p>
                      </div>
                    )}
                  />
                </div>

                <Controller
                  name="description"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField {...field} isInvalid={fieldState.invalid}>
                      <Label>Description</Label>
                      <TextArea rows={2} placeholder="Shown to visitors above the fields" />
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </TextField>
                  )}
                />

                <Controller
                  name="thank_you_message"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField {...field} isInvalid={fieldState.invalid}>
                      <Label>Thank-you message</Label>
                      <TextArea rows={2} placeholder="Shown after a successful submission" />
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </TextField>
                  )}
                />

                <Controller
                  name="status"
                  control={control}
                  render={({ field, fieldState }) => (
                    <div>
                      <Label>Status</Label>
                      <Select
                        aria-label="Status"
                        value={field.value}
                        onChange={(key) => typeof key === "string" && field.onChange(key)}
                        className="mt-1 w-full max-w-xs"
                        isInvalid={fieldState.invalid}
                      >
                        <Select.Trigger>
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox items={STATUS_OPTIONS}>
                            {(opt) => (
                              <ListBox.Item id={opt.id} textValue={opt.label}>
                                {opt.label}
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                            )}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                    </div>
                  )}
                />

                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <Label>Fields</Label>
                    <Button type="button" size="sm" variant="secondary" onPress={() => append(blankFormField())}>
                      <Plus className="size-3.5" />
                      Add field
                    </Button>
                  </div>
                  {errors.fields?.message ? <p className="text-sm text-danger">{errors.fields.message}</p> : null}
                  {fields.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-black/[0.12] p-4 text-center text-sm text-foreground/60 dark:border-white/[0.16]">
                      No fields yet — add one to get started.
                    </p>
                  ) : null}

                  {fields.map((f, index) => (
                    <FieldEditorRow
                      key={f.id}
                      control={control}
                      setValue={setValue}
                      getValues={getValues}
                      index={index}
                      onRemove={() => remove(index)}
                    />
                  ))}
                </div>

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

function FieldEditorRow({
  control,
  setValue,
  getValues,
  index,
  onRemove,
}: {
  control: Control<FormEditorValues>;
  setValue: UseFormSetValue<FormEditorValues>;
  getValues: UseFormGetValues<FormEditorValues>;
  index: number;
  onRemove: () => void;
}) {
  // Plain `watch`/`setValue` rather than `useFieldArray` — RHF's field-array
  // helper is built for arrays of objects (it injects its own `id` key per
  // row); `options` here is a plain `string[]`, so options are managed
  // directly against that array path instead.
  const fieldType = useWatch({ control, name: `fields.${index}.type` });
  const options = useWatch({ control, name: `fields.${index}.options` }) ?? [];

  function appendOption() {
    const current = getValues(`fields.${index}.options`) ?? [];
    setValue(`fields.${index}.options`, [...current, ""]);
  }
  function removeOption(optIndex: number) {
    const current = getValues(`fields.${index}.options`) ?? [];
    setValue(`fields.${index}.options`, current.filter((_, i) => i !== optIndex));
  }

  return (
    <div className="rounded-lg border border-black/[0.08] p-3 dark:border-white/[0.12]">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Field {index + 1}</span>
        <Button type="button" size="sm" variant="ghost" onPress={onRemove} aria-label={`Remove field ${index + 1}`}>
          <TrashBin className="size-3.5" />
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Controller
          name={`fields.${index}.name`}
          control={control}
          render={({ field, fieldState }) => (
            <TextField {...field} isInvalid={fieldState.invalid}>
              <Label>Field name</Label>
              <Input placeholder="first_name" />
              <FieldError>{fieldState.error?.message}</FieldError>
            </TextField>
          )}
        />
        <Controller
          name={`fields.${index}.label`}
          control={control}
          render={({ field, fieldState }) => (
            <TextField {...field} isInvalid={fieldState.invalid}>
              <Label>Label</Label>
              <Input placeholder="First name" />
              <FieldError>{fieldState.error?.message}</FieldError>
            </TextField>
          )}
        />
        <Controller
          name={`fields.${index}.type`}
          control={control}
          render={({ field }) => (
            <div>
              <Label>Type</Label>
              <Select
                aria-label={`Field ${index + 1} type`}
                value={field.value}
                onChange={(key) => typeof key === "string" && field.onChange(key)}
                className="mt-1 w-full"
              >
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox items={FIELD_TYPE_OPTIONS}>
                    {(opt) => (
                      <ListBox.Item id={opt.id} textValue={opt.label}>
                        <span className="capitalize">{opt.label}</span>
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    )}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>
          )}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <Controller
          name={`fields.${index}.required`}
          control={control}
          render={({ field }) => (
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                className="size-4 rounded-md accent-primary"
              />
              Required
            </label>
          )}
        />
        <Controller
          name={`fields.${index}.placeholder`}
          control={control}
          render={({ field, fieldState }) => (
            <TextField {...field} isInvalid={fieldState.invalid} className="min-w-[200px] flex-1">
              <Input placeholder="Placeholder text" />
              <FieldError>{fieldState.error?.message}</FieldError>
            </TextField>
          )}
        />
      </div>

      {fieldType === "select" ? (
        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between">
            <Label>Options</Label>
            <Button type="button" size="sm" variant="secondary" onPress={appendOption}>
              <Plus className="size-3" />
              Add option
            </Button>
          </div>
          <div className="flex flex-col gap-1.5">
            {options.map((opt, optIndex) => (
              <div key={optIndex} className="flex items-center gap-2">
                <Controller
                  name={`fields.${index}.options.${optIndex}`}
                  control={control}
                  render={({ field }) => (
                    <Input
                      value={typeof field.value === "string" ? field.value : opt}
                      onChange={field.onChange}
                      placeholder={`Option ${optIndex + 1}`}
                      className="flex-1"
                    />
                  )}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onPress={() => removeOption(optIndex)}
                  aria-label={`Remove option ${optIndex + 1}`}
                >
                  <TrashBin className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
