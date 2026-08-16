"use client";

import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Label, ListBox, Modal, Select, Switch, TextArea, TextField } from "@heroui/react";
import { Pencil, Plus, TrashBin } from "@gravity-ui/icons";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { IconButton } from "@/components/ui/IconButton";
import { customFieldFormSchema, type CustomFieldFormValues } from "@/features/leads/schema";
import {
  useCreateCustomFieldMutation,
  useDeleteCustomFieldMutation,
  useLeadCustomFieldsQuery,
  useUpdateCustomFieldMutation,
} from "@/features/leads/hooks/useLeadCustomFields";
import { useBoardColumnsManageQuery } from "@/features/leads/hooks/useColumnManagement";
import { leadActionErrorMessage } from "@/features/leads/leadActionError";
import {
  AMOUNT_CURRENCIES,
  COMPUTED_TYPES,
  CREATABLE_FIELD_TYPES,
  DEFAULT_AMOUNT_CURRENCY,
  LIST_OPTION_TYPES,
  ROLLUP_FUNCTIONS,
  getFieldType,
  type CustomFieldTypeKey,
  type LeadCustomFieldDef,
  type UpsertLeadCustomFieldPayload,
} from "@/features/leads/customFieldTypes";

function toFormValues(def?: LeadCustomFieldDef): CustomFieldFormValues {
  const opts = def?.field_options;
  const optsObj = opts && typeof opts === "object" && !Array.isArray(opts) ? (opts as Record<string, unknown>) : {};
  const listOptions =
    def && LIST_OPTION_TYPES.has(def.field_type) && Array.isArray(opts) ? (opts as string[]).join("\n") : "";
  const statusOptions =
    def?.field_type === "status" && Array.isArray(opts) ? (opts as { name: string }[]).map((o) => o.name).join("\n") : "";

  return {
    field_name: def?.field_name ?? "",
    field_type: def?.field_type ?? "text",
    optionsText: listOptions || statusOptions,
    is_required: def?.is_required ?? false,
    required_column_ids: def?.required_column_ids ?? [],
    amountCurrency: (optsObj.currency as "UZS" | "USD" | undefined) ?? DEFAULT_AMOUNT_CURRENCY,
    dateIncludeTime: optsObj.includeTime === true,
    formulaExpression: (optsObj.expression as string | undefined) ?? "",
    formulaDecimals: optsObj.decimals != null ? String(optsObj.decimals) : "",
    formulaFormat: (optsObj.format as "number" | "percent" | "currency" | undefined) ?? "number",
    rollupRelationField: (optsObj.relationField as string | undefined) ?? "",
    rollupTargetField: (optsObj.targetField as string | undefined) ?? "count",
    rollupFn: (optsObj.fn as "count" | "sum" | "avg" | "min" | "max" | undefined) ?? "count",
  };
}

/** Build the real `POST`/`PATCH /lead-custom-fields` body from the form —
 * the backend's own `validate()` still re-derives/enforces the exact same
 * per-type shape server-side, this is just "send what the type needs". */
function toPayload(values: CustomFieldFormValues): UpsertLeadCustomFieldPayload {
  const type = values.field_type as CustomFieldTypeKey;
  const base: UpsertLeadCustomFieldPayload = {
    field_name: values.field_name.trim(),
    field_type: type,
    is_required: COMPUTED_TYPES.has(type) ? false : values.is_required,
    required_column_ids: COMPUTED_TYPES.has(type) ? [] : values.required_column_ids,
  };

  if (LIST_OPTION_TYPES.has(type) || type === "status") {
    base.field_options = (values.optionsText ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  } else if (type === "amount") {
    base.field_options = { currency: values.amountCurrency ?? DEFAULT_AMOUNT_CURRENCY };
  } else if (type === "date") {
    base.field_options = values.dateIncludeTime ? { includeTime: true } : null;
  } else if (type === "formula") {
    base.field_options = {
      expression: (values.formulaExpression ?? "").trim(),
      decimals: values.formulaDecimals?.trim() ? Number(values.formulaDecimals) : null,
      format: values.formulaFormat ?? "number",
    };
  } else if (type === "rollup") {
    base.field_options = {
      relationField: values.rollupRelationField ?? "",
      targetField: values.rollupTargetField ?? "count",
      fn: values.rollupFn ?? "count",
    };
  }

  return base;
}

/**
 * Custom field definitions CRUD + per-stage required-field config
 * (Phase 2c-6, items 1+2) — `lead-custom-fields.controller.ts`. The
 * per-stage requirement (`required_column_ids`) is a checklist against
 * `boardId`'s own real columns (`useBoardColumnsManageQuery`, the same
 * management-scoped column list `ManageColumnsDialog` uses — includes
 * hidden columns, since a hidden stage can still be a real gate target).
 * This is the data layer `RequireFieldDialog` (Phase 2c-5) now reads from
 * to prompt for whichever custom fields are actually configured as
 * required, instead of only knowing built-in field names.
 */
export function ManageCustomFieldsDialog({ boardId, onClose }: { boardId: string; onClose: () => void }) {
  const fieldsQuery = useLeadCustomFieldsQuery();
  const columnsQuery = useBoardColumnsManageQuery(boardId);
  const createField = useCreateCustomFieldMutation();
  const updateField = useUpdateCustomFieldMutation();
  const deleteField = useDeleteCustomFieldMutation();

  const [editing, setEditing] = useState<{ mode: "create" } | { mode: "edit"; field: LeadCustomFieldDef } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<CustomFieldFormValues>({
    resolver: zodResolver(customFieldFormSchema),
    defaultValues: toFormValues(),
  });
  const selectedType = useWatch({ control, name: "field_type" }) as CustomFieldTypeKey;
  const isComputed = COMPUTED_TYPES.has(selectedType);

  const fields = fieldsQuery.data ?? [];
  const relationFields = fields.filter((f) => f.field_type === "relation");
  const columns = (columnsQuery.data ?? []).slice().sort((a, b) => a.display_order - b.display_order);

  function openCreate() {
    setError(null);
    reset(toFormValues());
    setEditing({ mode: "create" });
  }
  function openEdit(field: LeadCustomFieldDef) {
    setError(null);
    reset(toFormValues(field));
    setEditing({ mode: "edit", field });
  }

  const onSubmit = handleSubmit(async (values) => {
    if (createField.isPending || updateField.isPending) return; // guard double-submit
    setError(null);
    try {
      const payload = toPayload(values);
      if (editing?.mode === "edit") {
        await updateField.mutateAsync({ id: editing.field.id, payload });
      } else {
        await createField.mutateAsync(payload);
      }
      setEditing(null);
    } catch (err) {
      setError(leadActionErrorMessage(err));
    }
  });

  async function handleDelete(field: LeadCustomFieldDef) {
    if (deletingId) return; // guard double-submit
    if (!window.confirm(`Delete the "${field.field_name}" field? Existing lead values for it are not removed.`)) return;
    setError(null);
    setDeletingId(field.id);
    try {
      await deleteField.mutateAsync(field.id);
    } catch (err) {
      setError(leadActionErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  }

  const busy = fieldsQuery.isLoading || columnsQuery.isLoading;
  const failed = fieldsQuery.isError || columnsQuery.isError;

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Manage custom fields</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto">
              {busy ? (
                <LoadingState label="Loading custom fields…" />
              ) : failed ? (
                <ErrorState error={fieldsQuery.error ?? columnsQuery.error} onRetry={() => { void fieldsQuery.refetch(); void columnsQuery.refetch(); }} />
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {fields.map((field) => (
                    <li
                      key={field.id}
                      className="flex items-center gap-2 rounded-lg border border-black/[0.08] px-3 py-2 dark:border-white/[0.12]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {field.field_name}
                          <span className="ml-1.5 text-xs text-foreground/40">({getFieldType(field.field_type).label})</span>
                          {field.is_required ? <span className="ml-1.5 text-xs text-danger">required</span> : null}
                        </p>
                        {field.required_column_ids && field.required_column_ids.length > 0 ? (
                          <p className="text-xs text-foreground/50">
                            Also required for {field.required_column_ids.length} stage
                            {field.required_column_ids.length > 1 ? "s" : ""}
                          </p>
                        ) : null}
                      </div>
                      <Button isIconOnly size="sm" variant="ghost" aria-label={`Edit ${field.field_name}`} onPress={() => openEdit(field)}>
                        <Pencil className="size-3.5" aria-hidden="true" />
                      </Button>
                      <IconButton
                        label={`Delete ${field.field_name}`}
                        tooltip="Delete"
                        size="sm"
                        variant="ghost"
                        isDisabled={deletingId === field.id}
                        onPress={() => void handleDelete(field)}
                      >
                        <TrashBin className="size-3.5" aria-hidden="true" />
                      </IconButton>
                    </li>
                  ))}
                  {fields.length === 0 ? <p className="py-4 text-center text-sm text-foreground/50">No custom fields yet.</p> : null}
                </ul>
              )}

              {editing ? (
                <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3 rounded-lg border border-black/[0.08] p-3 dark:border-white/[0.12]">
                  <p className="text-xs font-medium text-foreground/70">
                    {editing.mode === "edit" ? `Edit "${editing.field.field_name}"` : "New custom field"}
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <Controller
                      name="field_name"
                      control={control}
                      render={({ field, fieldState }) => (
                        <TextField {...field} isInvalid={fieldState.invalid}>
                          <Label>Field name</Label>
                          <Input placeholder="e.g. Budget" />
                        </TextField>
                      )}
                    />
                    <Controller
                      name="field_type"
                      control={control}
                      render={({ field }) => (
                        <div>
                          <p className="mb-1 text-xs text-foreground/50">Type</p>
                          <Select
                            aria-label="Field type"
                            value={field.value}
                            onChange={(key) => field.onChange(typeof key === "string" ? key : "text")}
                          >
                            <Select.Trigger>
                              <Select.Value />
                              <Select.Indicator />
                            </Select.Trigger>
                            <Select.Popover>
                              <ListBox items={CREATABLE_FIELD_TYPES.map((t) => ({ id: t, label: getFieldType(t).label }))}>
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

                  {(LIST_OPTION_TYPES.has(selectedType) || selectedType === "status") ? (
                    <Controller
                      name="optionsText"
                      control={control}
                      render={({ field }) => (
                        <TextField {...field}>
                          <Label>Options (one per line)</Label>
                          <TextArea rows={3} placeholder={"Hot\nWarm\nCold"} />
                        </TextField>
                      )}
                    />
                  ) : null}

                  {selectedType === "amount" ? (
                    <Controller
                      name="amountCurrency"
                      control={control}
                      render={({ field }) => (
                        <div className="w-40">
                          <p className="mb-1 text-xs text-foreground/50">Currency</p>
                          <Select aria-label="Currency" value={field.value} onChange={(key) => field.onChange(typeof key === "string" ? key : DEFAULT_AMOUNT_CURRENCY)}>
                            <Select.Trigger>
                              <Select.Value />
                              <Select.Indicator />
                            </Select.Trigger>
                            <Select.Popover>
                              <ListBox items={AMOUNT_CURRENCIES.map((c) => ({ id: c, label: c }))}>
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
                  ) : null}

                  {selectedType === "date" ? (
                    <Controller
                      name="dateIncludeTime"
                      control={control}
                      render={({ field }) => (
                        <label className="flex items-center justify-between gap-4">
                          <span className="text-sm text-foreground/70">Include time of day</span>
                          <Switch isSelected={field.value} onChange={field.onChange} aria-label="Include time of day">
                            <Switch.Content>
                              <Switch.Control>
                                <Switch.Thumb />
                              </Switch.Control>
                            </Switch.Content>
                          </Switch>
                        </label>
                      )}
                    />
                  ) : null}

                  {selectedType === "formula" ? (
                    <div className="flex flex-col gap-3">
                      <Controller
                        name="formulaExpression"
                        control={control}
                        render={({ field }) => (
                          <TextField {...field}>
                            <Label>Expression</Label>
                            <TextArea rows={2} placeholder="e.g. age * 2" />
                          </TextField>
                        )}
                      />
                      <div className="flex gap-3">
                        <Controller
                          name="formulaDecimals"
                          control={control}
                          render={({ field }) => (
                            <TextField {...field} className="w-32">
                              <Label>Decimals</Label>
                              <Input placeholder="Auto" inputMode="numeric" />
                            </TextField>
                          )}
                        />
                        <Controller
                          name="formulaFormat"
                          control={control}
                          render={({ field }) => (
                            <div className="w-40">
                              <p className="mb-1 text-xs text-foreground/50">Format</p>
                              <Select aria-label="Format" value={field.value} onChange={(key) => field.onChange(typeof key === "string" ? key : "number")}>
                                <Select.Trigger>
                                  <Select.Value />
                                  <Select.Indicator />
                                </Select.Trigger>
                                <Select.Popover>
                                  <ListBox items={[{ id: "number", label: "Number" }, { id: "percent", label: "Percent" }, { id: "currency", label: "Currency" }]}>
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
                    </div>
                  ) : null}

                  {selectedType === "rollup" ? (
                    <div className="flex flex-col gap-3">
                      <Controller
                        name="rollupRelationField"
                        control={control}
                        render={({ field }) => (
                          <div>
                            <p className="mb-1 text-xs text-foreground/50">Relation field</p>
                            <Select
                              aria-label="Relation field"
                              value={field.value || undefined}
                              placeholder="Select a relation field…"
                              onChange={(key) => field.onChange(typeof key === "string" ? key : "")}
                            >
                              <Select.Trigger>
                                <Select.Value />
                                <Select.Indicator />
                              </Select.Trigger>
                              <Select.Popover>
                                <ListBox items={relationFields.map((f) => ({ id: f.field_name, label: f.field_name }))}>
                                  {(opt) => (
                                    <ListBox.Item id={opt.id} textValue={opt.label}>
                                      {opt.label}
                                      <ListBox.ItemIndicator />
                                    </ListBox.Item>
                                  )}
                                </ListBox>
                              </Select.Popover>
                            </Select>
                            {relationFields.length === 0 ? (
                              <p className="mt-1 text-xs text-foreground/40">Create a &ldquo;Relation&rdquo; field first.</p>
                            ) : null}
                          </div>
                        )}
                      />
                      <div className="flex gap-3">
                        <Controller
                          name="rollupFn"
                          control={control}
                          render={({ field }) => (
                            <div className="w-32">
                              <p className="mb-1 text-xs text-foreground/50">Function</p>
                              <Select aria-label="Function" value={field.value} onChange={(key) => field.onChange(typeof key === "string" ? key : "count")}>
                                <Select.Trigger>
                                  <Select.Value />
                                  <Select.Indicator />
                                </Select.Trigger>
                                <Select.Popover>
                                  <ListBox items={ROLLUP_FUNCTIONS.map((f) => ({ id: f, label: f }))}>
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
                          name="rollupTargetField"
                          control={control}
                          render={({ field, fieldState }) => (
                            <TextField {...field} isInvalid={fieldState.invalid} className="flex-1">
                              <Label>Target field (on the related lead)</Label>
                              <Input placeholder="e.g. age, or a custom field name" />
                            </TextField>
                          )}
                        />
                      </div>
                    </div>
                  ) : null}

                  {!isComputed ? (
                    <>
                      <Controller
                        name="is_required"
                        control={control}
                        render={({ field }) => (
                          <label className="flex items-center justify-between gap-4">
                            <span className="text-sm text-foreground/70">Required workspace-wide</span>
                            <Switch isSelected={field.value} onChange={field.onChange} aria-label="Required workspace-wide">
                              <Switch.Content>
                                <Switch.Control>
                                  <Switch.Thumb />
                                </Switch.Control>
                              </Switch.Content>
                            </Switch>
                          </label>
                        )}
                      />

                      {columns.length > 0 ? (
                        <Controller
                          name="required_column_ids"
                          control={control}
                          render={({ field }) => (
                            <div>
                              <p className="mb-1 text-xs text-foreground/50">Also required before a lead moves into these stages</p>
                              <div className="flex flex-col gap-1 rounded-lg border border-black/[0.08] p-2 dark:border-white/[0.12]">
                                {columns.map((col) => {
                                  const checked = field.value.includes(col.id);
                                  return (
                                    <label key={col.id} className="flex items-center gap-2 text-sm text-foreground">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() =>
                                          field.onChange(
                                            checked ? field.value.filter((id) => id !== col.id) : [...field.value, col.id],
                                          )
                                        }
                                        className="size-4 rounded border-black/20 dark:border-white/20"
                                      />
                                      {col.name}
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        />
                      ) : null}
                    </>
                  ) : (
                    <p className="text-xs text-foreground/40">Computed fields are read-only — never required, no per-stage gate.</p>
                  )}

                  {error ? (
                    <p role="alert" className="text-sm text-danger">
                      {error}
                    </p>
                  ) : null}

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" size="sm" onPress={() => setEditing(null)}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" size="sm" isDisabled={isSubmitting || createField.isPending || updateField.isPending}>
                      {isSubmitting || createField.isPending || updateField.isPending ? "Saving…" : "Save"}
                    </Button>
                  </div>
                </form>
              ) : (
                <Button variant="secondary" size="sm" className="w-fit" onPress={openCreate}>
                  <Plus className="size-3.5" aria-hidden="true" />
                  Add custom field
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
