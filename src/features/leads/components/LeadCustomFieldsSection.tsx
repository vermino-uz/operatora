"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { Pencil } from "@gravity-ui/icons";

import { useLeadCustomFieldsQuery } from "@/features/leads/hooks/useLeadCustomFields";
import { CustomFieldValue } from "@/features/leads/components/CustomFieldValue";
import { CustomFieldInput } from "@/features/leads/components/CustomFieldInput";
import { leadsApi } from "@/services/api/leads";
import { leadActionErrorMessage } from "@/features/leads/leadActionError";
import {
  COMPUTED_TYPES,
  coerceCustomFieldValue,
  validateCustomFieldValue,
  INTERNAL_LEAD_CUSTOM_FIELD_KEY,
} from "@/features/leads/customFieldTypes";
import { useSessionStore } from "@/state/session-store";
import type { LeadRow } from "@/features/leads/types";
import { useQueryClient } from "@tanstack/react-query";
import { leadQueryKey } from "@/features/leads/hooks/useLeadDetailsQuery";

/**
 * Type-aware custom-fields section for `LeadDetailsModal`'s Info tab
 * (Phase 2c-6) — replaces the earlier Phase 2b/2c-5 generic key/value dump
 * of `lead.custom_fields` (which had no type/label metadata to render
 * anything smarter). Read-only by default (`CustomFieldValue`, resolves
 * relation/rollup/formula/computed types for real); an "Edit" toggle
 * switches every non-computed field into its real input widget
 * (`CustomFieldInput`) with one shared Save, writing the whole
 * `custom_fields` object in one `PATCH /leads/:id` — same batch-write
 * pattern `RequireFieldDialog` already established, rather than a
 * per-field save round trip.
 */
export function LeadCustomFieldsSection({ lead }: { lead: LeadRow }) {
  const customFieldsQuery = useLeadCustomFieldsQuery();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fields = customFieldsQuery.data ?? [];
  if (fields.length === 0) return null;

  function startEdit() {
    setError(null);
    setValues({ ...(lead.custom_fields ?? {}) });
    setEditing(true);
  }

  async function handleSave() {
    if (saving) return; // guard double-submit
    setError(null);
    for (const def of fields) {
      if (COMPUTED_TYPES.has(def.field_type)) continue;
      const err = validateCustomFieldValue(def, values[def.field_name]);
      if (err) {
        setError(`${def.field_name}: ${err}`);
        return;
      }
    }
    setSaving(true);
    try {
      const next: Record<string, unknown> = { ...(lead.custom_fields ?? {}) };
      for (const def of fields) {
        if (COMPUTED_TYPES.has(def.field_type)) continue;
        next[def.field_name] = coerceCustomFieldValue(def.field_type, values[def.field_name]);
      }
      next[INTERNAL_LEAD_CUSTOM_FIELD_KEY] = useSessionStore.getState().user?.id ?? null;
      await leadsApi.patchLead(lead.id, { custom_fields: next });
      await queryClient.invalidateQueries({ queryKey: leadQueryKey(lead.id) });
      setEditing(false);
    } catch (err) {
      setError(leadActionErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs text-foreground/50">Custom fields</p>
        {!editing ? (
          <Button variant="ghost" size="sm" onPress={startEdit}>
            <Pencil className="size-3 shrink-0" aria-hidden="true" />
            Edit
          </Button>
        ) : null}
      </div>

      {editing ? (
        <div className="flex flex-col gap-3">
          {fields.map((def) => (
            <div key={def.id}>
              <p className="mb-1 text-xs text-foreground/50">{def.field_name}</p>
              {COMPUTED_TYPES.has(def.field_type) ? (
                <CustomFieldValue def={def} lead={lead} />
              ) : (
                <CustomFieldInput
                  def={def}
                  value={values[def.field_name]}
                  onChange={(next) => setValues((prev) => ({ ...prev, [def.field_name]: next }))}
                />
              )}
            </div>
          ))}
          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" isDisabled={saving} onPress={() => setEditing(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" isDisabled={saving} onPress={() => void handleSave()}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      ) : (
        <dl className="grid grid-cols-2 gap-2 text-sm">
          {fields.map((def) => (
            <div key={def.id} className="min-w-0">
              <dt className="truncate text-xs text-foreground/50">{def.field_name}</dt>
              <dd className="truncate text-foreground">
                <CustomFieldValue def={def} lead={lead} compact />
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
