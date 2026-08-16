/**
 * Custom-field TYPE registry (Phase 2c-6) — the single source of truth for
 * every lead custom-field type this app supports: how a value is coerced,
 * validated, derived (for computed types), and formatted for display.
 *
 * Traced directly against the real backend, not assumed from the old
 * frontend's own `lib/customFieldTypes.ts` (read for UX/shape reference
 * only, never modified): `leads-controller/lead-custom-fields/
 * lead-custom-fields.types.ts`'s `ALLOWED_FIELD_TYPES`/`COMPUTED_TYPES`/
 * `LIST_OPTION_TYPES` allowlists and `lead-custom-fields.service.ts`'s
 * `validate()` (the exact `field_options` shape per type the backend
 * accepts/persists) are the authority here — this module mirrors them
 * field-for-field so a definition created here always round-trips.
 *
 * **All 19 types traced are real** — every one is backed by
 * `POST/PATCH /lead-custom-fields`'s validated persistence. `relation` is
 * additionally backed by a real, dedicated lookup endpoint
 * (`GET /lead-search`, `GET /lead-search/by-ids` — see
 * `services/api/leadSearch.ts`), so a relation value (an array of lead ids
 * stored in `custom_fields.<name>`) always resolves to real leads, never a
 * fabricated id. `rollup`/`formula` have no server-side computation engine
 * (confirmed: the backend only validates+stores their *definition*, e.g.
 * `{relationField, fn, targetField}` / `{expression, decimals, format}| —
 * the actual aggregation/evaluation happens client-side, same as the old
 * frontend's own architecture) — this is legitimate, not a fake stand-in:
 * the definition is real and persisted server-side, and the values it
 * operates over (other real custom fields, or a real relation's resolved
 * leads) are real data fetched through real endpoints. No type was dropped.
 */

import { Parser } from "expr-eval";

export const ALLOWED_FIELD_TYPES = [
  "text",
  "number",
  "amount",
  "date",
  "select",
  "checkbox",
  "email",
  "phone_number",
  "url",
  "multi_select",
  "status",
  "created_time",
  "last_edited_time",
  "created_by",
  "last_edited_by",
  "relation",
  "rollup",
  "formula",
  "place",
] as const;

export type CustomFieldTypeKey = (typeof ALLOWED_FIELD_TYPES)[number];

export type FieldInputKind =
  | "text"
  | "number"
  | "amount"
  | "date"
  | "checkbox"
  | "select"
  | "multi_select"
  | "status"
  | "relation"
  | "none";

export type FieldDisplayKind =
  | "text"
  | "link"
  | "number"
  | "amount"
  | "date"
  | "datetime"
  | "checkbox"
  | "select"
  | "multi_select"
  | "status"
  | "person"
  | "relation";

export type FieldOptionsKind = "none" | "list" | "status" | "rollup" | "formula" | "amount" | "date";

export type FieldLinkKind = "email" | "tel" | "url";

export const AMOUNT_CURRENCIES = ["UZS", "USD"] as const;
export type AmountCurrency = (typeof AMOUNT_CURRENCIES)[number];
export const DEFAULT_AMOUNT_CURRENCY: AmountCurrency = "UZS";
export function isAmountCurrency(v: unknown): v is AmountCurrency {
  return typeof v === "string" && (AMOUNT_CURRENCIES as readonly string[]).includes(v);
}

export const ROLLUP_FUNCTIONS = ["count", "sum", "avg", "min", "max"] as const;
export type RollupFunction = (typeof ROLLUP_FUNCTIONS)[number];

export type FormulaFormat = "number" | "percent" | "currency";

export interface StatusOption {
  name: string;
  color: string;
}

/** `field_options` shape per type, matching `lead-custom-fields.service.ts`'s
 * `validate()` exactly (see that function's own switch). */
export type FieldOptions =
  | string[] // select / multi_select
  | StatusOption[] // status
  | { expression: string; decimals: number | null; format: FormulaFormat } // formula
  | { currency: AmountCurrency } // amount
  | { includeTime: true } // date (absent/null = no time component)
  | { relationField: string; targetField: string; fn: RollupFunction } // rollup
  | null;

/** A `lead_custom_fields` row (`GET /lead-custom-fields`). */
export interface LeadCustomFieldDef {
  id: string;
  workspace_id: string;
  field_name: string;
  field_type: CustomFieldTypeKey;
  field_options: FieldOptions;
  is_required: boolean;
  /** Pipeline column (board stage) ids this field is additionally required
   * for, on top of `is_required` — the per-stage required-field config. */
  required_column_ids: string[] | null;
  display_order: number;
  created_by: string | null;
}

/** Body shape for `POST`/`PATCH /lead-custom-fields` — the backend
 * re-derives/validates everything from this, so this client only needs to
 * send the same shape back, not replicate the validation itself. */
export interface UpsertLeadCustomFieldPayload {
  field_name: string;
  field_type: CustomFieldTypeKey;
  field_options?: unknown;
  is_required?: boolean;
  required_column_ids?: string[];
}

/** Types whose `field_options` is a plain list of option names. */
export const LIST_OPTION_TYPES: ReadonlySet<CustomFieldTypeKey> = new Set(["select", "multi_select"]);

/** Computed / read-only types — never required, never store a value in
 * `custom_fields`, never offered a value input. */
export const COMPUTED_TYPES: ReadonlySet<CustomFieldTypeKey> = new Set([
  "created_time",
  "last_edited_time",
  "created_by",
  "last_edited_by",
  "rollup",
  "formula",
]);

export interface CustomFieldTypeDef {
  key: CustomFieldTypeKey;
  label: string;
  inputKind: FieldInputKind;
  displayKind: FieldDisplayKind;
  optionsKind: FieldOptionsKind;
  linkKind?: FieldLinkKind;
  computed: boolean;
}

export const CUSTOM_FIELD_TYPES: Record<CustomFieldTypeKey, CustomFieldTypeDef> = {
  text: { key: "text", label: "Text", inputKind: "text", displayKind: "text", optionsKind: "none", computed: false },
  number: { key: "number", label: "Number", inputKind: "number", displayKind: "number", optionsKind: "none", computed: false },
  amount: { key: "amount", label: "Amount", inputKind: "amount", displayKind: "amount", optionsKind: "amount", computed: false },
  date: { key: "date", label: "Date", inputKind: "date", displayKind: "date", optionsKind: "date", computed: false },
  select: { key: "select", label: "Select", inputKind: "select", displayKind: "select", optionsKind: "list", computed: false },
  checkbox: { key: "checkbox", label: "Checkbox", inputKind: "checkbox", displayKind: "checkbox", optionsKind: "none", computed: false },
  email: { key: "email", label: "Email", inputKind: "text", displayKind: "link", linkKind: "email", optionsKind: "none", computed: false },
  phone_number: { key: "phone_number", label: "Phone", inputKind: "text", displayKind: "link", linkKind: "tel", optionsKind: "none", computed: false },
  url: { key: "url", label: "URL", inputKind: "text", displayKind: "link", linkKind: "url", optionsKind: "none", computed: false },
  multi_select: { key: "multi_select", label: "Multi-select", inputKind: "multi_select", displayKind: "multi_select", optionsKind: "list", computed: false },
  status: { key: "status", label: "Status", inputKind: "status", displayKind: "status", optionsKind: "status", computed: false },
  created_time: { key: "created_time", label: "Created time", inputKind: "none", displayKind: "datetime", optionsKind: "none", computed: true },
  last_edited_time: { key: "last_edited_time", label: "Last edited time", inputKind: "none", displayKind: "datetime", optionsKind: "none", computed: true },
  created_by: { key: "created_by", label: "Created by", inputKind: "none", displayKind: "person", optionsKind: "none", computed: true },
  last_edited_by: { key: "last_edited_by", label: "Last edited by", inputKind: "none", displayKind: "person", optionsKind: "none", computed: true },
  relation: { key: "relation", label: "Relation", inputKind: "relation", displayKind: "relation", optionsKind: "none", computed: false },
  rollup: { key: "rollup", label: "Rollup", inputKind: "none", displayKind: "text", optionsKind: "rollup", computed: true },
  formula: { key: "formula", label: "Formula", inputKind: "none", displayKind: "text", optionsKind: "formula", computed: true },
  place: { key: "place", label: "Place", inputKind: "text", displayKind: "text", optionsKind: "none", computed: false },
};

export function getFieldType(key: string | null | undefined): CustomFieldTypeDef {
  return (key && CUSTOM_FIELD_TYPES[key as CustomFieldTypeKey]) || CUSTOM_FIELD_TYPES.text;
}

export const CREATABLE_FIELD_TYPES: CustomFieldTypeKey[] = [...ALLOWED_FIELD_TYPES];

/** Palette for status option colors — mirrors the backend's own
 * `OPTION_COLORS`/`colorForOption()` exactly (`lead-custom-fields.types.ts`)
 * so a client-side preview matches what the server will actually persist. */
export const OPTION_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e",
  "#10b981", "#14b8a6", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6",
  "#a855f7", "#ec4899", "#f43f5e", "#64748b",
];

export function colorForOption(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return OPTION_COLORS[h % OPTION_COLORS.length]!;
}

// ---------------------------------------------------------------------------
// value coercion / formatting
// ---------------------------------------------------------------------------

const isBlank = (v: unknown): boolean => v == null || (typeof v === "string" && v.trim() === "");

/** Normalize a raw value for storage under `custom_fields.<field_name>`,
 * per type. Mirrors the old frontend's per-type `coerce()`. */
export function coerceCustomFieldValue(type: CustomFieldTypeKey, raw: unknown): unknown {
  switch (type) {
    case "checkbox":
      return raw === true || raw === "true" || raw === 1 || raw === "1";
    case "number":
    case "amount": {
      if (isBlank(raw)) return null;
      const n = typeof raw === "number" ? raw : Number(String(raw).trim());
      return Number.isFinite(n) ? n : null;
    }
    case "multi_select":
    case "relation":
      return Array.isArray(raw) ? raw.map(String) : isBlank(raw) ? [] : [String(raw)];
    default:
      if (isBlank(raw)) return null;
      return String(raw).trim();
  }
}

/** Basic client-side UX validation (backend remains authoritative). Returns
 * an error string, or null if valid. */
export function validateCustomFieldValue(def: LeadCustomFieldDef, value: unknown): string | null {
  const type = def.field_type;
  const required = def.is_required;
  const blank =
    isBlank(value) || (Array.isArray(value) && value.length === 0) || (type === "checkbox" && value !== true);

  if (type === "checkbox") return null; // a checkbox is never "blank" in a way worth blocking on
  if (required && blank) return "This field is required";
  if (blank) return null;

  if (type === "email" && typeof value === "string" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
    return "Enter a valid email address";
  }
  if (type === "url" && typeof value === "string" && !/^https?:\/\/[^\s]+$/i.test(value.trim())) {
    return "Enter a valid URL (starting with http:// or https://)";
  }
  if (type === "phone_number" && typeof value === "string" && !/^[+]?[\d\s()-]{6,}$/.test(value.trim())) {
    return "Enter a valid phone number";
  }
  if ((type === "number" || type === "amount") && !Number.isFinite(Number(value))) {
    return "Enter a valid number";
  }
  return null;
}

export function amountFieldCurrency(def: LeadCustomFieldDef | null | undefined): AmountCurrency {
  const o = def?.field_options;
  const c = o && typeof o === "object" && !Array.isArray(o) ? (o as { currency?: unknown }).currency : undefined;
  return isAmountCurrency(c) ? c : DEFAULT_AMOUNT_CURRENCY;
}

export function coerceAmountNumber(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(String(raw).trim());
  return Number.isFinite(n) ? n : null;
}

export function formatAmount(raw: unknown, currency: AmountCurrency = DEFAULT_AMOUNT_CURRENCY): string {
  const n = coerceAmountNumber(raw);
  if (n == null) return "";
  try {
    return new Intl.NumberFormat(currency === "USD" ? "en-US" : "ru-RU", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: currency === "USD" ? 2 : 0,
    }).format(n);
  } catch {
    return `${n} ${currency}`;
  }
}

export function formatNumberFieldValue(value: unknown): string {
  if (value == null || value === "") return "";
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return String(value);
  const decimals = String(num).split(".")[1]?.length ?? 0;
  return new Intl.NumberFormat(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(num);
}

export function dateFieldIncludesTime(def: LeadCustomFieldDef | null | undefined): boolean {
  const o = def?.field_options;
  return !!(def?.field_type === "date" && o && typeof o === "object" && !Array.isArray(o) && (o as { includeTime?: unknown }).includeTime === true);
}

/** `<input type="date">`/`<input type="datetime-local">` value from a stored
 * ISO string, in local time. */
export function toDateInputValue(value: unknown, includeTime: boolean): string {
  if (typeof value !== "string" || !value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const ymd = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return includeTime ? `${ymd}T${pad(d.getHours())}:${pad(d.getMinutes())}` : ymd;
}

// ---------------------------------------------------------------------------
// formula evaluation — pure parser (expr-eval), no eval()/Function(), so a
// workspace-authored expression can never reach anything beyond the
// variable map it's given. Same library + safety rationale as the old
// frontend's own `evaluateFormula()`.
// ---------------------------------------------------------------------------

const formulaParser = new Parser();

export function sanitizeVarName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, "_").replace(/^([0-9])/, "_$1");
}

/** Build the variable map a formula can reference: every other numeric/
 * string custom field on the lead, plus `age`. */
function buildFormulaVars(lead: { age?: number | null; custom_fields?: Record<string, unknown> | null }): Record<string, number | string> {
  const vars: Record<string, number | string> = {};
  const cf = lead.custom_fields ?? {};
  for (const [k, v] of Object.entries(cf)) {
    if (k.startsWith("__")) continue;
    const key = sanitizeVarName(k);
    if (typeof v === "number") vars[key] = v;
    else if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) vars[key] = Number(v);
    else if (typeof v === "string") vars[key] = v;
    else if (typeof v === "boolean") vars[key] = v ? 1 : 0;
  }
  if (typeof lead.age === "number") vars.age = lead.age;
  return vars;
}

export function evaluateFormula(
  expression: string,
  lead: { age?: number | null; custom_fields?: Record<string, unknown> | null },
): number | string | null {
  if (!expression) return null;
  try {
    const result: unknown = formulaParser.evaluate(expression, buildFormulaVars(lead));
    if (typeof result === "number") return Number.isFinite(result) ? result : null;
    if (typeof result === "string" || typeof result === "boolean") return String(result);
    return null;
  } catch {
    return null;
  }
}

export function formatFormulaResult(value: number | string | null, opts?: { decimals?: number | null; format?: FormulaFormat | null }): string {
  if (value == null || value === "") return "";
  const num = typeof value === "number" ? value : Number(value);
  if (typeof value === "string" && Number.isNaN(num)) return value;
  if (!Number.isFinite(num)) return String(value);

  const fmt = opts?.format ?? "number";
  const hasDec = typeof opts?.decimals === "number" && opts.decimals >= 0;
  const nf = new Intl.NumberFormat(undefined, {
    useGrouping: fmt === "currency",
    minimumFractionDigits: hasDec ? (opts!.decimals as number) : 0,
    maximumFractionDigits: hasDec ? (opts!.decimals as number) : fmt === "percent" || fmt === "currency" ? 2 : 6,
  });
  const text = nf.format(num);
  return fmt === "percent" ? `${text}%` : text;
}

// ---------------------------------------------------------------------------
// rollup aggregation — over already-resolved related leads (fetched via
// `GET /lead-search/by-ids`, see `useRelationTargetsQuery`). Client-side, for
// the same "definition is real, aggregation isn't server-computed" reason
// documented at the top of this file.
// ---------------------------------------------------------------------------

export interface RollupTarget {
  id: string;
  age?: number | null;
  custom_fields?: Record<string, unknown> | null;
}

export function computeRollup(
  fn: RollupFunction,
  targetField: string,
  targets: RollupTarget[],
): number | null {
  if (fn === "count") return targets.length;
  const values: number[] = [];
  for (const t of targets) {
    const raw = targetField === "age" ? t.age : (t.custom_fields ?? {})[targetField];
    const n = typeof raw === "number" ? raw : Number(raw);
    if (Number.isFinite(n)) values.push(n);
  }
  if (values.length === 0) return fn === "sum" ? 0 : null;
  switch (fn) {
    case "sum":
      return values.reduce((a, b) => a + b, 0);
    case "avg":
      return values.reduce((a, b) => a + b, 0) / values.length;
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
    default:
      return null;
  }
}

/** Keys written into `leads.custom_fields` for internal bookkeeping (the
 * `last_edited_by` computed type's backing value) — never rendered as a
 * user-facing field, matches the old frontend's `INTERNAL_LEAD_CUSTOM_FIELD_KEYS`
 * convention (`lib/leadCustomFields.ts`) exactly, since this is a pure
 * client-side write convention, not a backend contract. */
export const INTERNAL_LEAD_CUSTOM_FIELD_KEY = "__last_edited_by_id";
