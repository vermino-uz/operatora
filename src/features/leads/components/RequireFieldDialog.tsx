"use client";

import { useState } from "react";
import { Button, Input, Label, ListBox, Modal, Select, TextField } from "@heroui/react";

import { useSessionStore } from "@/state/session-store";
import { useTeamMembersQuery } from "@/features/team/hooks/useTeamMembersQuery";
import { deadlineApi } from "@/services/api/leadDeadline";
import { leadsApi } from "@/services/api/leads";
import { leadActionErrorMessage } from "@/features/leads/leadActionError";
import { BUILTIN_LEAD_FIELD_META, type LeadRow } from "@/features/leads/types";
import { useLeadCustomFieldsQuery } from "@/features/leads/hooks/useLeadCustomFields";
import { CustomFieldInput } from "@/features/leads/components/CustomFieldInput";
import { coerceCustomFieldValue, validateCustomFieldValue, INTERNAL_LEAD_CUSTOM_FIELD_KEY } from "@/features/leads/customFieldTypes";

/**
 * Guided "fix and retry" dialog for a `FIELD_REQUIRED:field1,field2` gate
 * failure (Phase 2c-5) — the old frontend's `RequireFieldDialog` equivalent.
 * Only reachable from Mark Sold/Mark Rejected: both endpoints
 * (`sold-leads-list.service.ts`/`rejected-leads-list.service.ts`) pass the
 * gate's `BadRequestException` straight through as a real 400, confirmed
 * directly. The raw Kanban column-move endpoint
 * (`right-board-controller/change-column`) has a traced backend bug that
 * demotes this same gate failure to a generic 500 with no parseable detail
 * — see `leadActionErrorMessage`'s doc comment — so this dialog is
 * deliberately NOT wired to column-move failures; that path only gets an
 * honest generic message instead of a UI that can't actually work.
 *
 * `deadline` is set via the dedicated `PATCH /deadline/:leadId`; every other
 * field goes through the generic `PATCH /leads/:id` (`leadsApi.patchLead`) —
 * a known builtin `leads` column if `BUILTIN_LEAD_FIELD_META` has an entry
 * for it, otherwise (Phase 2c-6) looked up against the workspace's real
 * `lead_custom_fields` definitions (`useLeadCustomFieldsQuery`) and rendered
 * with the correct type-aware `CustomFieldInput` widget — a plain text
 * fallback only applies if no matching definition exists at all (e.g. an
 * automation rule referencing a field name that's since been deleted).
 * Custom-field writes also stamp `custom_fields.__last_edited_by_id`,
 * matching the old frontend's own write convention (see
 * `customFieldTypes.ts`'s `INTERNAL_LEAD_CUSTOM_FIELD_KEY` doc comment) so
 * the `last_edited_by` computed type resolves correctly afterward.
 * Saves once, then calls `onResolved()` so the caller can retry the
 * original mark-sold/mark-rejected call exactly once — no automatic loop if
 * the retry fails again for a different reason.
 */
export function RequireFieldDialog({
  lead,
  missingFields,
  onClose,
  onResolved,
}: {
  lead: LeadRow;
  missingFields: string[];
  onClose: () => void;
  onResolved: () => void;
}) {
  const workspaceId = useSessionStore((s) => s.workspaceId);
  // Same query key as `LeadDetailsModal`'s own operator picker (this dialog
  // is only ever opened from a mark-sold/mark-rejected flow that's already
  // opened from there), so TanStack Query dedupes this against the
  // already-in-flight/cached request rather than firing a second one.
  const operatorsQuery = useTeamMembersQuery(workspaceId, {});
  const customFieldsQuery = useLeadCustomFieldsQuery();
  // Free-text/deadline values (builtin, or a custom field with no traceable
  // definition — see the doc comment above) stay strings; custom-field
  // values keyed by field name hold the widget's raw shape (string, number,
  // boolean, or string[] for multi_select/relation).
  const [values, setValues] = useState<Record<string, string>>({});
  const [customValues, setCustomValues] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function setValue(field: string, v: string) {
    setValues((prev) => ({ ...prev, [field]: v }));
  }

  const customFieldsByName = new Map((customFieldsQuery.data ?? []).map((f) => [f.field_name, f]));

  const onSubmit = async () => {
    if (saving) return; // guard double-submit

    // Validate every missing field before sending anything.
    for (const field of missingFields) {
      const meta = BUILTIN_LEAD_FIELD_META[field];
      const customDef = !meta ? customFieldsByName.get(field) : undefined;
      if (customDef) {
        const err = validateCustomFieldValue({ ...customDef, is_required: true }, customValues[field]);
        if (err) {
          setError(`${field}: ${err}`);
          return;
        }
      } else if (!values[field]?.trim()) {
        setError("Fill in every field before continuing.");
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      if (missingFields.includes("deadline")) {
        const iso = new Date(values.deadline).toISOString();
        await deadlineApi.update(lead.id, iso);
      }
      const otherFields = missingFields.filter((f) => f !== "deadline");
      if (otherFields.length > 0) {
        const patch: Record<string, unknown> = {};
        const customFields: Record<string, unknown> = { ...(lead.custom_fields ?? {}) };
        let hasCustom = false;
        for (const field of otherFields) {
          const meta = BUILTIN_LEAD_FIELD_META[field];
          const customDef = !meta ? customFieldsByName.get(field) : undefined;
          if (meta?.input === "number") {
            patch[field] = Number(values[field]);
          } else if (meta) {
            patch[field] = values[field];
          } else if (customDef) {
            customFields[field] = coerceCustomFieldValue(customDef.field_type, customValues[field]);
            hasCustom = true;
          } else {
            customFields[field] = values[field];
            hasCustom = true;
          }
        }
        if (hasCustom) {
          customFields[INTERNAL_LEAD_CUSTOM_FIELD_KEY] = useSessionStore.getState().user?.id ?? null;
          patch.custom_fields = customFields;
        }
        if (Object.keys(patch).length > 0) {
          await leadsApi.patchLead(lead.id, patch);
        }
      }
      onResolved();
    } catch (err) {
      setError(leadActionErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onOpenChange={(open) => !open && !saving && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Missing required information</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto">
              <p className="text-sm text-foreground/70">
                This workspace requires the field{missingFields.length > 1 ? "s" : ""} below before this lead can
                move here. Fill them in and continue.
              </p>

              {missingFields.map((field) => {
                const meta = BUILTIN_LEAD_FIELD_META[field];
                const label = meta?.label ?? field;

                if (meta?.input === "deadline") {
                  return (
                    <TextField key={field}>
                      <Label>{label}</Label>
                      <Input
                        type="datetime-local"
                        value={values[field] ?? ""}
                        onChange={(e) => setValue(field, e.target.value)}
                      />
                    </TextField>
                  );
                }

                if (meta?.input === "select" && meta.options) {
                  return (
                    <div key={field}>
                      <p className="mb-1 text-xs text-foreground/50">{label}</p>
                      <Select
                        aria-label={label}
                        value={values[field] || undefined}
                        placeholder={`Select ${label.toLowerCase()}…`}
                        onChange={(key) => setValue(field, typeof key === "string" ? key : "")}
                      >
                        <Select.Trigger>
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox items={meta.options.map((opt) => ({ id: opt, label: opt }))}>
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
                  );
                }

                if (meta?.input === "operator") {
                  return (
                    <div key={field}>
                      <p className="mb-1 text-xs text-foreground/50">{label}</p>
                      <Select
                        aria-label={label}
                        value={values[field] || undefined}
                        isDisabled={operatorsQuery.isLoading}
                        placeholder="Select an operator…"
                        onChange={(key) => setValue(field, typeof key === "string" ? key : "")}
                      >
                        <Select.Trigger>
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox
                            items={(operatorsQuery.data ?? []).map((op) => ({
                              id: op.user_id,
                              label: op.full_name || op.email || op.user_id,
                            }))}
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
                    </div>
                  );
                }

                if (!meta) {
                  const customDef = customFieldsByName.get(field);
                  if (customDef) {
                    return (
                      <div key={field}>
                        <p className="mb-1 text-xs text-foreground/50">{customDef.field_name}</p>
                        <CustomFieldInput
                          def={customDef}
                          value={customValues[field]}
                          onChange={(next) => setCustomValues((prev) => ({ ...prev, [field]: next }))}
                        />
                      </div>
                    );
                  }
                }

                return (
                  <TextField key={field}>
                    <Label>{label}</Label>
                    <Input
                      type={meta?.input === "number" ? "number" : "text"}
                      value={values[field] ?? ""}
                      onChange={(e) => setValue(field, e.target.value)}
                    />
                  </TextField>
                );
              })}

              {error ? (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              ) : null}
            </Modal.Body>
            <Modal.Footer>
              <Button type="button" variant="secondary" isDisabled={saving} onPress={onClose}>
                Cancel
              </Button>
              <Button type="button" variant="primary" isDisabled={saving} onPress={() => void onSubmit()}>
                {saving ? "Saving…" : "Save and continue"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
