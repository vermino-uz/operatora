import { parseCsv, toCsv } from "@/lib/csv";
import {
  amountFieldCurrency,
  formatAmount,
  formatNumberFieldValue,
  type LeadCustomFieldDef,
} from "@/features/leads/customFieldTypes";

/** Fixed header order the real `GET /leads-list/export` endpoint always
 * returns (`leadsToCsv()`) — see `services/api/leadsExportImport.ts`'s doc
 * comment for why this can't be requested as a subset server-side. */
export const STANDARD_EXPORT_COLUMNS = [
  { key: "id", label: "ID" },
  { key: "first_name", label: "First name" },
  { key: "last_name", label: "Last name" },
  { key: "phone_number", label: "Phone" },
  { key: "age", label: "Age" },
  { key: "marital_status", label: "Marital status" },
  { key: "academic_status", label: "Academic status" },
  { key: "stage", label: "Stage" },
  { key: "operator", label: "Operator" },
  { key: "deadline", label: "Deadline" },
  { key: "created_at", label: "Created at" },
  { key: "updated_at", label: "Updated at" },
] as const;
export type StandardExportColumnKey = (typeof STANDARD_EXPORT_COLUMNS)[number]["key"];

/** Formats one raw custom-field value for a CSV cell, reusing the same
 * per-type formatters the lead card/details view uses (Phase 2c-6) — so an
 * exported amount/number/multi-select reads the same as it does in the UI,
 * not a raw JSON fragment. */
function formatCustomFieldForCsv(def: LeadCustomFieldDef, raw: unknown): string {
  if (raw == null || raw === "") return "";
  switch (def.field_type) {
    case "amount":
      return formatAmount(raw, amountFieldCurrency(def));
    case "number":
      return formatNumberFieldValue(raw);
    case "checkbox":
      return raw === true ? "Yes" : "No";
    case "multi_select":
    case "relation":
      return Array.isArray(raw) ? raw.join(", ") : String(raw);
    default:
      return typeof raw === "string" ? raw : JSON.stringify(raw);
  }
}

/**
 * Reshapes the real server CSV (`leadsExportApi.exportCsv`'s `csv` string)
 * into the user's chosen column selection — parses what the server actually
 * sent (never re-fetches or re-derives lead data client-side) and either
 * drops standard columns the user unchecked, or expands the single raw
 * `custom_fields` JSON column into one real column per registered custom
 * field (by `field_name`, matching every other read path in this feature —
 * see `CustomFieldValue.tsx`). Any custom-field key present in the JSON that
 * doesn't match a known definition (e.g. a field deleted since, or a lead
 * created by the known `leads-import` bulk-import id-keying quirk — see
 * PROGRESS.md) is never silently dropped: it stays visible in a trailing
 * "Custom fields (raw)" column so no data is lost.
 */
export function buildExportCsv(
  serverCsv: string,
  opts: {
    standardColumns: Set<StandardExportColumnKey>;
    expandCustomFields: boolean;
    customFieldDefs: LeadCustomFieldDef[];
  },
): { csv: string; rowCount: number } {
  const rows = parseCsv(serverCsv);
  if (rows.length === 0) return { csv: "", rowCount: 0 };

  const [serverHeaders, ...dataRows] = rows;
  const idx = Object.fromEntries(serverHeaders.map((h, i) => [h, i]));

  const standardKeys = STANDARD_EXPORT_COLUMNS.filter((c) => opts.standardColumns.has(c.key));
  const headerRow: string[] = standardKeys.map((c) => c.label);
  if (opts.expandCustomFields) {
    headerRow.push(...opts.customFieldDefs.map((d) => d.field_name));
    headerRow.push("Custom fields (raw)");
  } else {
    headerRow.push("Custom fields");
  }

  const outRows: string[][] = [headerRow];
  const cfColIdx = idx.custom_fields;

  for (const row of dataRows) {
    const out: string[] = standardKeys.map((c) => row[idx[c.key]] ?? "");

    let parsedCf: Record<string, unknown> = {};
    const rawCf = cfColIdx != null ? row[cfColIdx] : "";
    if (rawCf) {
      try {
        const parsed: unknown = JSON.parse(rawCf);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          parsedCf = parsed as Record<string, unknown>;
        }
      } catch {
        // Not valid JSON — leave parsedCf empty, raw text still preserved below.
      }
    }

    if (opts.expandCustomFields) {
      const consumedKeys = new Set<string>();
      for (const def of opts.customFieldDefs) {
        const value = parsedCf[def.field_name];
        if (value !== undefined) consumedKeys.add(def.field_name);
        out.push(formatCustomFieldForCsv(def, value));
      }
      const leftover = Object.fromEntries(Object.entries(parsedCf).filter(([k]) => !consumedKeys.has(k)));
      out.push(Object.keys(leftover).length > 0 ? JSON.stringify(leftover) : "");
    } else {
      out.push(rawCf ?? "");
    }

    outRows.push(out);
  }

  return { csv: toCsv(outRows), rowCount: dataRows.length };
}
