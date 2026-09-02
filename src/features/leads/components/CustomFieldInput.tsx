"use client";

import { useState } from "react";
import { Chip, Input, ListBox, Select, TextField } from "@heroui/react";
import { Xmark } from "@gravity-ui/icons";

import { useDebounce } from "@/hooks/useDebounce";
import {
  amountFieldCurrency,
  dateFieldIncludesTime,
  toDateInputValue,
  type LeadCustomFieldDef,
} from "@/features/leads/customFieldTypes";
import { useLeadSearchQuery, useLeadsByIdsQuery } from "@/features/leads/hooks/useLeadSearch";
import { ImageFieldInput } from "@/features/leads/components/ImageFieldInput";

/**
 * Editable, type-aware input widget for one custom field's value — used by
 * `CreateLeadDialog`, `LeadDetailsModal`'s Info tab (edit mode), and
 * `RequireFieldDialog`. `value`/`onChange` operate on the field's raw
 * stored shape (see `coerceCustomFieldValue()` — the caller coerces on
 * submit, this component just edits). Computed types (`created_time`,
 * `rollup`, `formula`, ...) render nothing — they have no input, by design
 * (see `COMPUTED_TYPES`).
 */
export function CustomFieldInput({
  def,
  value,
  onChange,
  isInvalid,
}: {
  def: LeadCustomFieldDef;
  value: unknown;
  onChange: (next: unknown) => void;
  isInvalid?: boolean;
}) {
  switch (def.field_type) {
    case "text":
    case "place":
      return (
        <Input
          aria-label={def.field_name}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "email":
      return (
        <Input
          type="email"
          aria-label={def.field_name}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "url":
      return (
        <Input
          type="url"
          aria-label={def.field_name}
          placeholder="https://…"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "phone_number":
      return (
        <Input
          type="tel"
          aria-label={def.field_name}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "number":
      return (
        <Input
          type="number"
          aria-label={def.field_name}
          value={value == null ? "" : String(value)}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "amount": {
      const currency = amountFieldCurrency(def);
      return (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            aria-label={def.field_name}
            value={value == null ? "" : String(value)}
            onChange={(e) => onChange(e.target.value)}
          />
          <span className="shrink-0 text-xs text-foreground/50">{currency}</span>
        </div>
      );
    }

    case "date": {
      const includeTime = dateFieldIncludesTime(def);
      return (
        <Input
          type={includeTime ? "datetime-local" : "date"}
          aria-label={def.field_name}
          value={toDateInputValue(value, includeTime)}
          onChange={(e) => {
            const raw = e.target.value;
            onChange(raw ? new Date(raw).toISOString() : null);
          }}
        />
      );
    }

    case "checkbox":
      return (
        <label className="flex w-fit items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
            className="size-4 rounded-md border-black/20 dark:border-white/20"
          />
          {def.field_name}
        </label>
      );

    case "select": {
      const options = Array.isArray(def.field_options) ? (def.field_options as string[]) : [];
      return (
        <Select
          aria-label={def.field_name}
          value={typeof value === "string" ? value : undefined}
          placeholder="Select…"
          isInvalid={isInvalid}
          onChange={(key) => onChange(typeof key === "string" ? key : null)}
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox items={options.map((o) => ({ id: o, label: o }))}>
              {(opt) => (
                <ListBox.Item id={opt.id} textValue={opt.label}>
                  {opt.label}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              )}
            </ListBox>
          </Select.Popover>
        </Select>
      );
    }

    case "status": {
      const options = Array.isArray(def.field_options) ? (def.field_options as { name: string; color: string }[]) : [];
      return (
        <Select
          aria-label={def.field_name}
          value={typeof value === "string" ? value : undefined}
          placeholder="Select…"
          isInvalid={isInvalid}
          onChange={(key) => onChange(typeof key === "string" ? key : null)}
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox items={options.map((o) => ({ id: o.name, label: o.name }))}>
              {(opt) => (
                <ListBox.Item id={opt.id} textValue={opt.label}>
                  {opt.label}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              )}
            </ListBox>
          </Select.Popover>
        </Select>
      );
    }

    case "multi_select": {
      const options = Array.isArray(def.field_options) ? (def.field_options as string[]) : [];
      const selected = new Set(Array.isArray(value) ? value.map(String) : []);
      return (
        <div className="flex flex-wrap gap-1.5">
          {options.map((opt) => {
            const isOn = selected.has(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  const next = new Set(selected);
                  if (isOn) next.delete(opt);
                  else next.add(opt);
                  onChange(Array.from(next));
                }}
                className={
                  isOn
                    ? "rounded-full bg-accent px-2.5 py-1 text-xs text-accent-foreground"
                    : "rounded-full border border-black/[0.12] px-2.5 py-1 text-xs text-foreground/70 dark:border-white/[0.16]"
                }
              >
                {opt}
              </button>
            );
          })}
        </div>
      );
    }

    case "relation":
      return <RelationFieldInput value={Array.isArray(value) ? value.map(String) : []} onChange={onChange} />;

    case "image":
      return (
        <ImageFieldInput
          value={value}
          onChange={(next) => onChange(next)}
        />
      );

    default:
      // Computed types (created_time/last_edited_time/created_by/
      // last_edited_by/rollup/formula) have no input — nothing to render.
      return null;
  }
}

/** `relation` field input — search box (debounced, `GET /lead-search`) +
 * result list + selected-chips, multi-value. Kept intentionally simple
 * (native list, not a HeroUI `ComboBox`, whose exact anatomy wasn't worth
 * verifying for this one narrow use — same "avoid guessing an unverified
 * compound anatomy" precedent `RowCheckbox` already established for a
 * one-off control). */
function RelationFieldInput({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const searchQuery = useLeadSearchQuery(debouncedQuery, debouncedQuery.trim().length > 0);
  const selectedQuery = useLeadsByIdsQuery(value);
  const selectedNames = new Map((selectedQuery.data ?? []).map((l) => [l.id, l.name]));

  function toggle(id: string) {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  }

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((id) => (
            <Chip key={id} size="sm" variant="secondary">
              <Chip.Label>{selectedNames.get(id) ?? id}</Chip.Label>
              <button type="button" aria-label="Remove" onClick={() => toggle(id)} className="ml-1">
                <Xmark className="size-3" aria-hidden="true" />
              </button>
            </Chip>
          ))}
        </div>
      ) : null}
      <TextField>
        <Input placeholder="Search leads by name or phone…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </TextField>
      {debouncedQuery.trim() ? (
        <div className="max-h-40 overflow-y-auto rounded-lg border border-black/[0.08] dark:border-white/[0.12]">
          {searchQuery.isLoading ? (
            <p className="px-3 py-2 text-xs text-foreground/50">Searching…</p>
          ) : (searchQuery.data ?? []).length === 0 ? (
            <p className="px-3 py-2 text-xs text-foreground/50">No leads found.</p>
          ) : (
            (searchQuery.data ?? []).map((result) => (
              <button
                key={result.id}
                type="button"
                onClick={() => toggle(result.id)}
                className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
              >
                {result.name}
                {value.includes(result.id) ? <span className="text-xs text-accent">Selected</span> : null}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
