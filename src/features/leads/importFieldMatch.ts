/**
 * Client-side mirror of the real `POST /leads-import/bulk` endpoint's own
 * header auto-detection — traced directly from
 * `leads-controller/leads-import/leads-import.util.ts`'s `NAME_HEADERS`/
 * `LAST_NAME_HEADERS`/`PHONE_HEADERS`/`COMMENT_HEADERS`/`AGE_HEADERS`/
 * `MARITAL_HEADERS`/`STAGE_HEADERS`/`DEADLINE_HEADERS`/`CREATED_HEADERS`
 * synonym sets and `normalizeHeader()`/`mapHeaderToField()`, copied
 * value-for-value (not reinvented) so this preview never disagrees with
 * what the server will actually do with the same header text.
 *
 * The real backend endpoint has no client-configurable column-mapping
 * parameter at all (confirmed by reading the controller/service/DTO
 * directly — `bulkImport()` only accepts `file`/`board_id`/`column_id`/
 * `workspace_id`/`operator_id`); it parses whatever header text is in row 1
 * of the uploaded file itself. So "column mapping" here is implemented as a
 * real, functional client-side step for `.csv` uploads only: this app
 * parses the file, shows the user how each header will be interpreted, lets
 * them correct any header the backend wouldn't recognize (or map it to a
 * workspace custom field), and rewrites the CSV's header row to the exact
 * canonical text the backend's own matcher expects before uploading — not a
 * fabricated server contract, just a deterministic pre-processing step
 * against the real one. `.xlsx`/`.xls` files skip this preview (uploaded
 * as-is; the backend's identical auto-detection still runs on those).
 */

export type ImportBuiltinField =
  | "name"
  | "last_name"
  | "phone"
  | "comment"
  | "age"
  | "marital_status"
  | "stage"
  | "deadline"
  | "created_at";

/** The exact canonical header text the backend's `NAME_HEADERS` etc. sets
 * recognize — used both to label the picker and as the rewritten header
 * text sent back to the server. */
export const BUILTIN_FIELD_CANONICAL_HEADER: Record<ImportBuiltinField, string> = {
  name: "Name",
  last_name: "last_name",
  phone: "Phone",
  comment: "Comment",
  age: "Age",
  marital_status: "marital_status",
  stage: "Stage",
  deadline: "deadline",
  created_at: "created_at",
};

export const BUILTIN_FIELD_LABELS: Record<ImportBuiltinField, string> = {
  name: "Full name (or first name)",
  last_name: "Last name",
  phone: "Phone number",
  comment: "Comment / note",
  age: "Age",
  marital_status: "Marital status",
  stage: "Stage (pipeline column name)",
  deadline: "Deadline",
  created_at: "Created date",
};

const NAME_HEADERS = new Set(["name", "full_name", "fullname", "ism", "ism_familiya", "fio", "first_name"]);
const LAST_NAME_HEADERS = new Set(["last_name", "familiya", "surname"]);
const PHONE_HEADERS = new Set(["phone_number", "phone", "telefon", "tel", "raqam", "mobile", "contact"]);
const COMMENT_HEADERS = new Set(["comment", "comments", "izoh", "note", "notes", "kommentariy", "description"]);
const AGE_HEADERS = new Set(["age", "yosh", "возраст"]);
const MARITAL_HEADERS = new Set(["marital_status", "oilaviy_ahvol", "oilaviy_ahvoli", "семейное_положение"]);
const STAGE_HEADERS = new Set(["stage", "ustun", "column", "bosqich", "этап", "стадия"]);
const DEADLINE_HEADERS = new Set(["deadline", "muddat", "срок"]);
const CREATED_HEADERS = new Set(["created_at", "yaratilgan", "создан", "created", "date_created"]);

export function normalizeImportHeader(header: string): string {
  return header
    .replace(/^﻿/, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

export function matchBuiltinHeader(header: string): ImportBuiltinField | null {
  const h = normalizeImportHeader(header);
  if (!h) return null;
  if (NAME_HEADERS.has(h)) return "name";
  if (LAST_NAME_HEADERS.has(h)) return "last_name";
  if (PHONE_HEADERS.has(h)) return "phone";
  if (COMMENT_HEADERS.has(h)) return "comment";
  if (AGE_HEADERS.has(h)) return "age";
  if (MARITAL_HEADERS.has(h)) return "marital_status";
  if (STAGE_HEADERS.has(h)) return "stage";
  if (DEADLINE_HEADERS.has(h)) return "deadline";
  if (CREATED_HEADERS.has(h)) return "created_at";
  return null;
}

/** One column-mapping row for the import preview — `sourceHeader` is the
 * file's own header text; `target` is what it will be interpreted as. */
export type ImportColumnMapping =
  | { kind: "builtin"; field: ImportBuiltinField }
  | { kind: "custom"; fieldName: string }
  | { kind: "ignore" };
