"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Label, ListBox, Modal, Select, TextField } from "@heroui/react";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { createLeadSchema, type CreateLeadFormValues } from "@/features/leads/schema";
import { useCreateLeadMutation } from "@/features/leads/hooks/useLeadMutations";
import { useAddLeadColumnsQuery } from "@/features/leads/hooks/useAddLeadColumnsQuery";
import { useLeadCustomFieldsQuery } from "@/features/leads/hooks/useLeadCustomFields";
import { leadActionErrorMessage } from "@/features/leads/leadActionError";
import { ACADEMIC_STATUS_OPTIONS, MARITAL_STATUS_OPTIONS } from "@/features/leads/types";
import { CustomFieldInput } from "@/features/leads/components/CustomFieldInput";
import { COMPUTED_TYPES, coerceCustomFieldValue, validateCustomFieldValue } from "@/features/leads/customFieldTypes";
import { ApiError } from "@/types/api";

/**
 * `POST /add-lead` — new lead into the current board/column. Field set
 * deliberately narrower than the old frontend's `CreateLeadDialog.tsx`:
 * first/last name as two plain fields (not the old app's single "full name"
 * input that splits on the last space — a workaround for a UI choice, not a
 * backend requirement, so this app just exposes the two real DB columns
 * directly), plus phone/age/marital/academic status, the pipeline column,
 * and (Phase 2c-6) every non-computed workspace custom field, rendered with
 * its real type-aware widget (`CustomFieldInput`) and validated client-side
 * against its own `is_required` flag before submit. The duplicate-lead
 * open/delete resolution panel is still out of scope — see PROGRESS.md.
 */
export function CreateLeadDialog({
  boardId,
  workspaceId,
  defaultColumnId,
  onClose,
}: {
  boardId: string;
  workspaceId: string;
  defaultColumnId?: string;
  onClose: () => void;
}) {
  const columnsQuery = useAddLeadColumnsQuery(boardId);
  const customFieldsQuery = useLeadCustomFieldsQuery();
  const createLead = useCreateLeadMutation(boardId);
  const [error, setError] = useState<string | null>(null);
  const [customValues, setCustomValues] = useState<Record<string, unknown>>({});
  const editableCustomFields = (customFieldsQuery.data ?? []).filter((f) => !COMPUTED_TYPES.has(f.field_type));

  const columns = columnsQuery.data ?? [];
  const resolvedDefaultColumn = defaultColumnId ?? columns[0]?.id ?? "";

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<CreateLeadFormValues>({
    resolver: zodResolver(createLeadSchema),
    values: {
      first_name: "",
      last_name: "",
      phone_number: "",
      age: "",
      marital_status: "",
      academic_status: "",
      column_id: resolvedDefaultColumn,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (createLead.isPending) return; // guard double-submit
    setError(null);

    for (const def of editableCustomFields) {
      const err = validateCustomFieldValue(def, customValues[def.field_name]);
      if (err) {
        setError(`${def.field_name}: ${err}`);
        return;
      }
    }

    const customFields: Record<string, unknown> = {};
    for (const def of editableCustomFields) {
      const coerced = coerceCustomFieldValue(def.field_type, customValues[def.field_name]);
      const isEmpty = coerced == null || coerced === "" || (Array.isArray(coerced) && coerced.length === 0);
      if (!isEmpty) customFields[def.field_name] = coerced;
    }

    try {
      await createLead.mutateAsync({
        workspace_id: workspaceId,
        first_name: values.first_name.trim(),
        last_name: values.last_name?.trim() || undefined,
        phone_number: values.phone_number?.trim() || undefined,
        age: values.age?.trim() ? Number(values.age.trim()) : undefined,
        marital_status: values.marital_status || undefined,
        academic_status: values.academic_status || undefined,
        column_id: values.column_id,
        custom_fields: Object.keys(customFields).length > 0 ? customFields : undefined,
      });
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.code === "DUPLICATE_LEAD") {
        setError(err.message);
      } else {
        setError(leadActionErrorMessage(err));
      }
    }
  });

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Add lead</Modal.Heading>
            </Modal.Header>
            <form onSubmit={onSubmit} noValidate>
              <Modal.Body className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto">
                {columnsQuery.isLoading ? (
                  <LoadingState label="Loading pipeline stages…" />
                ) : columnsQuery.isError ? (
                  <ErrorState error={columnsQuery.error} onRetry={() => columnsQuery.refetch()} />
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <Controller
                        name="first_name"
                        control={control}
                        render={({ field, fieldState }) => (
                          <TextField {...field} isInvalid={fieldState.invalid} isRequired>
                            <Label>First name</Label>
                            <Input placeholder="Ali" />
                            {fieldState.error ? <p className="mt-1 text-xs text-danger">{fieldState.error.message}</p> : null}
                          </TextField>
                        )}
                      />
                      <Controller
                        name="last_name"
                        control={control}
                        render={({ field, fieldState }) => (
                          <TextField {...field} isInvalid={fieldState.invalid}>
                            <Label>Last name</Label>
                            <Input placeholder="Valiyev" />
                          </TextField>
                        )}
                      />
                    </div>

                    <Controller
                      name="phone_number"
                      control={control}
                      render={({ field, fieldState }) => (
                        <TextField {...field} isInvalid={fieldState.invalid}>
                          <Label>Phone</Label>
                          <Input type="tel" placeholder="+998 90 123 45 67" />
                        </TextField>
                      )}
                    />

                    <div className="grid grid-cols-3 gap-3">
                      <Controller
                        name="age"
                        control={control}
                        render={({ field, fieldState }) => (
                          <TextField {...field} isInvalid={fieldState.invalid}>
                            <Label>Age</Label>
                            <Input type="number" min={0} max={120} placeholder="—" />
                            {fieldState.error ? <p className="mt-1 text-xs text-danger">{fieldState.error.message}</p> : null}
                          </TextField>
                        )}
                      />
                      <Controller
                        name="marital_status"
                        control={control}
                        render={({ field }) => (
                          <div>
                            <p className="mb-1 text-xs text-foreground/50">Marital status</p>
                            <Select
                              aria-label="Marital status"
                              value={field.value || undefined}
                              placeholder="—"
                              onChange={(key) => field.onChange(typeof key === "string" ? key : "")}
                            >
                              <Select.Trigger>
                                <Select.Value />
                                <Select.Indicator />
                              </Select.Trigger>
                              <Select.Popover>
                                <ListBox items={MARITAL_STATUS_OPTIONS.map((o) => ({ id: o, label: o }))}>
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
                      <Controller
                        name="academic_status"
                        control={control}
                        render={({ field }) => (
                          <div>
                            <p className="mb-1 text-xs text-foreground/50">Academic status</p>
                            <Select
                              aria-label="Academic status"
                              value={field.value || undefined}
                              placeholder="—"
                              onChange={(key) => field.onChange(typeof key === "string" ? key : "")}
                            >
                              <Select.Trigger>
                                <Select.Value />
                                <Select.Indicator />
                              </Select.Trigger>
                              <Select.Popover>
                                <ListBox items={ACADEMIC_STATUS_OPTIONS.map((o) => ({ id: o, label: o }))}>
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
                    </div>

                    <Controller
                      name="column_id"
                      control={control}
                      render={({ field, fieldState }) => (
                        <div>
                          <p className="mb-1 text-xs text-foreground/50">Pipeline stage</p>
                          <Select
                            aria-label="Pipeline stage"
                            value={field.value || undefined}
                            placeholder="Select a stage…"
                            isInvalid={fieldState.invalid}
                            onChange={(key) => field.onChange(typeof key === "string" ? key : "")}
                          >
                            <Select.Trigger>
                              <Select.Value />
                              <Select.Indicator />
                            </Select.Trigger>
                            <Select.Popover>
                              <ListBox items={columns.map((c) => ({ id: c.id, label: c.name }))}>
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

                    {editableCustomFields.length > 0 ? (
                      <div className="flex flex-col gap-3 border-t border-black/[0.08] pt-3 dark:border-white/[0.12]">
                        <p className="text-xs font-medium text-foreground/70">Custom fields</p>
                        {editableCustomFields.map((def) => (
                          <div key={def.id}>
                            <p className="mb-1 text-xs text-foreground/50">
                              {def.field_name}
                              {def.is_required ? <span className="text-danger"> *</span> : null}
                            </p>
                            <CustomFieldInput
                              def={def}
                              value={customValues[def.field_name]}
                              onChange={(next) => setCustomValues((prev) => ({ ...prev, [def.field_name]: next }))}
                            />
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </>
                )}

                {error ? (
                  <p role="alert" className="text-sm text-danger">
                    {error}
                  </p>
                ) : null}
              </Modal.Body>
              <Modal.Footer>
                <Button type="button" variant="secondary" onPress={onClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isDisabled={isSubmitting || createLead.isPending || columnsQuery.isLoading || columns.length === 0}
                >
                  {isSubmitting || createLead.isPending ? "Creating…" : "Create lead"}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
