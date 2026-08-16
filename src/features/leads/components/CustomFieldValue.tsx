"use client";

import type { ReactNode } from "react";
import { Chip } from "@heroui/react";

import {
  amountFieldCurrency,
  evaluateFormula,
  formatAmount,
  formatFormulaResult,
  formatNumberFieldValue,
  computeRollup,
  type LeadCustomFieldDef,
  type RollupFunction,
} from "@/features/leads/customFieldTypes";
import { useLeadsByIdsQuery } from "@/features/leads/hooks/useLeadSearch";

interface DeriveSource {
  created_at?: string | null;
  updated_at?: string | null;
  created_by?: string | null;
  age?: number | null;
  custom_fields?: Record<string, unknown> | null;
}

/** Read-only, type-aware render of one custom field's current value —
 * used on `LeadCard` (compact) and `LeadDetailsModal`'s Info tab. Every
 * branch corresponds 1:1 to a real, traced type (see
 * `customFieldTypes.ts`'s header comment) — nothing here renders a value
 * for a type this app can't actually persist/resolve. `resolveOperatorName`
 * is optional (only the details panel has a Team Members list handy); when
 * absent, `created_by`/`last_edited_by` fall back to the raw id. */
export function CustomFieldValue({
  def,
  lead,
  resolveOperatorName,
  compact,
}: {
  def: LeadCustomFieldDef;
  lead: DeriveSource;
  resolveOperatorName?: (userId: string | null | undefined) => string | null;
  compact?: boolean;
}) {
  const value = (lead.custom_fields ?? {})[def.field_name];
  const empty = <span className="text-foreground/30">—</span>;

  switch (def.field_type) {
    case "created_time":
      return <span>{lead.created_at ? new Date(lead.created_at).toLocaleString() : empty}</span>;

    case "last_edited_time":
      return <span>{(lead.updated_at ?? lead.created_at) ? new Date((lead.updated_at ?? lead.created_at) as string).toLocaleString() : empty}</span>;

    case "created_by":
      return <span>{resolveOperatorName?.(lead.created_by) ?? lead.created_by ?? empty}</span>;

    case "last_edited_by": {
      const id = (lead.custom_fields?.__last_edited_by_id as string | undefined) ?? null;
      return <span>{id ? (resolveOperatorName?.(id) ?? id) : empty}</span>;
    }

    case "formula": {
      const opts = def.field_options;
      const isFormulaOptions = opts != null && typeof opts === "object" && !Array.isArray(opts) && "expression" in opts;
      const expression = isFormulaOptions ? String((opts as { expression: unknown }).expression ?? "") : "";
      const raw = evaluateFormula(expression, lead);
      const formatted = formatFormulaResult(
        raw,
        isFormulaOptions ? (opts as { decimals: number | null; format: "number" | "percent" | "currency" }) : undefined,
      );
      return <span>{formatted || empty}</span>;
    }

    case "rollup":
      return <RollupValue def={def} lead={lead} empty={empty} />;

    case "amount": {
      if (value == null || value === "") return empty;
      return <span className="tabular-nums">{formatAmount(value, amountFieldCurrency(def))}</span>;
    }

    case "number":
      return <span className="tabular-nums">{value == null || value === "" ? empty : formatNumberFieldValue(value)}</span>;

    case "checkbox":
      return <span>{value === true ? "Yes" : "No"}</span>;

    case "date":
      return <span>{typeof value === "string" && value ? new Date(value).toLocaleDateString() : empty}</span>;

    case "email":
      return typeof value === "string" && value ? (
        <a href={`mailto:${value}`} className="text-accent underline">
          {value}
        </a>
      ) : (
        empty
      );

    case "phone_number":
      return typeof value === "string" && value ? (
        <a href={`tel:${value}`} className="font-mono text-accent underline">
          {value}
        </a>
      ) : (
        empty
      );

    case "url":
      return typeof value === "string" && value ? (
        <a href={value} target="_blank" rel="noreferrer" className="truncate text-accent underline">
          {value}
        </a>
      ) : (
        empty
      );

    case "status": {
      if (typeof value !== "string" || !value) return empty;
      const options = Array.isArray(def.field_options) ? (def.field_options as { name: string; color: string }[]) : [];
      const opt = options.find((o) => o.name === value);
      return (
        <Chip size="sm" style={opt ? { backgroundColor: `${opt.color}22`, color: opt.color } : undefined}>
          <Chip.Label>{value}</Chip.Label>
        </Chip>
      );
    }

    case "multi_select": {
      const values = Array.isArray(value) ? value.map(String) : [];
      if (values.length === 0) return empty;
      return (
        <span className="flex flex-wrap gap-1">
          {values.map((v) => (
            <Chip key={v} size="sm" variant="secondary">
              <Chip.Label>{v}</Chip.Label>
            </Chip>
          ))}
        </span>
      );
    }

    case "relation": {
      const ids = Array.isArray(value) ? value.map(String) : [];
      return <RelationValue ids={ids} empty={empty} compact={compact} />;
    }

    case "select":
    case "place":
    case "text":
    default:
      return typeof value === "string" && value ? <span className="truncate">{value}</span> : empty;
  }
}

const ROLLUP_FN_VALUES: readonly RollupFunction[] = ["count", "sum", "avg", "min", "max"];

function RollupValue({ def, lead, empty }: { def: LeadCustomFieldDef; lead: DeriveSource; empty: ReactNode }) {
  const opts = def.field_options;
  const isRollupOptions = opts != null && typeof opts === "object" && !Array.isArray(opts) && "relationField" in opts;
  const rollupOpts = isRollupOptions ? (opts as { relationField: string; targetField: string; fn: unknown }) : null;
  const relationField = rollupOpts ? String(rollupOpts.relationField) : "";
  const fn: RollupFunction = rollupOpts && ROLLUP_FN_VALUES.includes(rollupOpts.fn as RollupFunction) ? (rollupOpts.fn as RollupFunction) : "count";
  const targetField = rollupOpts ? String(rollupOpts.targetField) : "count";
  const relationValue = (lead.custom_fields ?? {})[relationField];
  const ids = Array.isArray(relationValue) ? relationValue.map(String) : [];
  const targetsQuery = useLeadsByIdsQuery(ids);

  if (ids.length === 0) return <>{fn === "count" ? "0" : empty}</>;
  if (targetsQuery.isLoading) return <span className="text-foreground/40">…</span>;

  const result = computeRollup(fn, targetField, targetsQuery.data ?? []);
  return <span className="tabular-nums">{result == null ? empty : formatNumberFieldValue(result)}</span>;
}

function RelationValue({ ids, empty, compact }: { ids: string[]; empty: ReactNode; compact?: boolean }) {
  const targetsQuery = useLeadsByIdsQuery(ids);
  if (ids.length === 0) return <>{empty}</>;
  if (targetsQuery.isLoading) return <span className="text-foreground/40">…</span>;
  const names = (targetsQuery.data ?? []).map((t) => t.name);
  if (compact) return <span className="truncate">{names.join(", ") || empty}</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {names.map((name, i) => (
        <Chip key={ids[i]} size="sm" variant="secondary">
          <Chip.Label>{name}</Chip.Label>
        </Chip>
      ))}
    </span>
  );
}
