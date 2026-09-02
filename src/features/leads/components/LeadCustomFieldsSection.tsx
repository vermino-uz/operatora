"use client";

import { useEffect, useState } from "react";
import { Spinner } from "@heroui/react";
import { useQueryClient } from "@tanstack/react-query";

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
  type LeadCustomFieldDef,
} from "@/features/leads/customFieldTypes";
import { useSessionStore } from "@/state/session-store";
import type { LeadRow } from "@/features/leads/types";
import { leadQueryKey } from "@/features/leads/hooks/useLeadDetailsQuery";

const SAVE_ON_CHANGE = new Set(["select", "status", "checkbox", "multi_select", "date", "relation", "image"]);

function InlineCustomFieldRow({ def, lead }: { def: LeadCustomFieldDef; lead: LeadRow }) {
  const queryClient = useQueryClient();
  const initial = (lead.custom_fields as Record<string, unknown> | null | undefined)?.[def.field_name];
  const [value, setValue] = useState<unknown>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValue(initial);
  }, [initial, lead.id]);

  async function persist(next: unknown) {
    const validationError = validateCustomFieldValue(def, next);
    if (validationError) {
      setError(validationError);
      return;
    }

    const coerced = coerceCustomFieldValue(def.field_type, next);
    const current = coerceCustomFieldValue(def.field_type, initial);
    if (JSON.stringify(coerced) === JSON.stringify(current)) return;

    setSaving(true);
    setError(null);
    try {
      const nextCustomFields: Record<string, unknown> = { ...(lead.custom_fields ?? {}) };
      nextCustomFields[def.field_name] = coerced;
      nextCustomFields[INTERNAL_LEAD_CUSTOM_FIELD_KEY] = useSessionStore.getState().user?.id ?? null;
      await leadsApi.patchLead(lead.id, { custom_fields: nextCustomFields });
      await queryClient.invalidateQueries({ queryKey: leadQueryKey(lead.id) });
    } catch (err) {
      setError(leadActionErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function handleChange(next: unknown) {
    setValue(next);
    if (SAVE_ON_CHANGE.has(def.field_type)) void persist(next);
  }

  if (COMPUTED_TYPES.has(def.field_type)) {
    return (
      <div className="min-w-0">
        <p className="mb-1 text-xs text-foreground/50">{def.field_name}</p>
        <div className="text-sm text-foreground">
          <CustomFieldValue def={def} lead={lead} compact />
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-w-0"
      onBlur={(e) => {
        if (SAVE_ON_CHANGE.has(def.field_type)) return;
        if (!e.currentTarget.contains(e.relatedTarget as Node)) void persist(value);
      }}
    >
      <div className="mb-1 flex items-center gap-2">
        <p className="truncate text-xs text-foreground/50">{def.field_name}</p>
        {saving ? <Spinner size="sm" aria-label="Saving" /> : null}
      </div>
      <CustomFieldInput def={def} value={value} onChange={handleChange} isInvalid={Boolean(error)} />
      {error ? (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Custom fields on the lead details Info tab — always editable inline (old
 * UI parity: click/type to edit, no separate Edit mode). The list scrolls
 * independently when there are many fields.
 */
export function LeadCustomFieldsSection({ lead }: { lead: LeadRow }) {
  const customFieldsQuery = useLeadCustomFieldsQuery();
  const fields = customFieldsQuery.data ?? [];
  if (fields.length === 0) return null;

  return (
    <div className="flex min-h-0 flex-col">
      <p className="mb-2 text-xs text-foreground/50">Custom fields</p>
      <div className="min-h-0 max-h-[min(480px,50vh)] overflow-y-auto overscroll-contain rounded-xl border border-black/[0.08] bg-[var(--default)]/40 p-3 dark:border-white/[0.12]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {fields.map((def) => (
            <InlineCustomFieldRow key={def.id} def={def} lead={lead} />
          ))}
        </div>
      </div>
    </div>
  );
}
