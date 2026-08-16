"use client";

import { useMemo, useRef, useState } from "react";
import { Button, ListBox, Modal, Select } from "@heroui/react";
import { ArrowDownToSquare, ArrowUpFromSquare, FileText } from "@gravity-ui/icons";

import { leadActionErrorMessage } from "@/features/leads/leadActionError";
import { useAddLeadColumnsQuery } from "@/features/leads/hooks/useAddLeadColumnsQuery";
import { useLeadCustomFieldsQuery } from "@/features/leads/hooks/useLeadCustomFields";
import { useLeadBulkImportMutation, useLeadImportSampleMutation } from "@/features/leads/hooks/useLeadImport";
import { COMPUTED_TYPES } from "@/features/leads/customFieldTypes";
import {
  BUILTIN_FIELD_CANONICAL_HEADER,
  BUILTIN_FIELD_LABELS,
  matchBuiltinHeader,
  normalizeImportHeader,
  type ImportBuiltinField,
  type ImportColumnMapping,
} from "@/features/leads/importFieldMatch";
import { parseCsv, toCsv, downloadBase64File } from "@/lib/csv";
import type { LeadsBulkImportResult } from "@/services/api/leadsExportImport";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".xlsx", ".xls", ".csv"];
/** Non-empty MIME types this app will accept when the browser actually
 * reports one — extension is still the primary/authoritative check below
 * since `.csv` MIME reporting is notoriously inconsistent across OS/browser
 * combinations (often empty or a generic `text/plain`). */
const ACCEPTABLE_MIME = new Set([
  "text/csv",
  "application/csv",
  "text/plain",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

function fileExtension(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

function validateFile(file: File): string | null {
  const ext = fileExtension(file.name);
  if (!ALLOWED_EXTENSIONS.includes(ext)) return "Only .xlsx, .xls, or .csv files are supported.";
  if (file.type && !ACCEPTABLE_MIME.has(file.type)) return "That file doesn't look like a spreadsheet or CSV — check the file type.";
  if (file.size > MAX_FILE_BYTES) return "That file is too large (max 5 MB).";
  if (file.size === 0) return "That file is empty.";
  return null;
}

/**
 * CSV/spreadsheet bulk import (Phase 2c-9) — real `GET /leads-import/sample`
 * + `POST /leads-import/bulk`, see `services/api/leadsExportImport.ts`'s
 * doc comment for the full trace. The real endpoint auto-detects headers
 * itself server-side and has no client-mapping parameter — the
 * column-mapping step below is a genuine client-side pre-processing step
 * for `.csv` uploads (parse → show detected mapping → let the user correct
 * unrecognized headers or point one at a custom field → rewrite the header
 * row to the exact canonical text the server's own matcher expects), not a
 * fabricated server contract — see `features/leads/importFieldMatch.ts`'s
 * header comment. `.xlsx`/`.xls` skip this preview and upload as-is (the
 * server's identical auto-detection still runs on those; parsing Excel
 * client-side would need a new binary-spreadsheet-parsing dependency this
 * app doesn't otherwise need).
 */
export function LeadsImportDialog({
  boardId,
  workspaceId,
  operators,
  onClose,
}: {
  boardId: string;
  workspaceId: string;
  operators: { id: string; label: string }[];
  onClose: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const columnsQuery = useAddLeadColumnsQuery(boardId);
  const customFieldsQuery = useLeadCustomFieldsQuery();
  const sampleMutation = useLeadImportSampleMutation();
  const importMutation = useLeadBulkImportMutation(boardId);

  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<string[][] | null>(null); // csv only
  const [mapping, setMapping] = useState<ImportColumnMapping[]>([]);
  const [columnId, setColumnId] = useState<string>("");
  const [operatorId, setOperatorId] = useState<string>("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<LeadsBulkImportResult | null>(null);

  const importableCustomFields = useMemo(
    () => (customFieldsQuery.data ?? []).filter((d) => !COMPUTED_TYPES.has(d.field_type)),
    [customFieldsQuery.data],
  );
  const columns = columnsQuery.data ?? [];
  // Falls back to the board's first stage whenever nothing's been explicitly
  // chosen yet (covers both "picked a file before columns finished loading"
  // and the normal case) — a derived value, not synced via an effect.
  const effectiveColumnId = columnId || columns[0]?.id || "";
  const isCsv = file ? fileExtension(file.name) === ".csv" : false;
  const headers = parsedRows?.[0] ?? [];
  const dataRowCount = parsedRows ? parsedRows.length - 1 : 0;

  async function handleDownloadSample() {
    try {
      const sample = await sampleMutation.mutateAsync(workspaceId);
      downloadBase64File(sample.base64, sample.filename, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    } catch {
      setFileError("Couldn't download the sample template — try again.");
    }
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!picked) return;
    setResult(null);
    setSubmitError(null);

    const err = validateFile(picked);
    if (err) {
      setFileError(err);
      return;
    }
    setFileError(null);
    setFile(picked);

    if (fileExtension(picked.name) === ".csv") {
      picked
        .text()
        .then((text) => {
          const rows = parseCsv(text);
          if (rows.length === 0) {
            setFileError("That CSV file has no rows.");
            setParsedRows(null);
            return;
          }
          setParsedRows(rows);
          setMapping(
            rows[0].map((h): ImportColumnMapping => {
              const builtin = matchBuiltinHeader(h);
              if (builtin) return { kind: "builtin", field: builtin };
              const norm = normalizeImportHeader(h);
              const customMatch = importableCustomFields.find((d) => normalizeImportHeader(d.field_name) === norm);
              if (customMatch) return { kind: "custom", fieldName: customMatch.field_name };
              return { kind: "ignore" };
            }),
          );
        })
        .catch(() => setFileError("Couldn't read that CSV file — try re-saving it and uploading again."));
    } else {
      setParsedRows(null);
      setMapping([]);
    }
  }

  function updateMapping(index: number, next: ImportColumnMapping) {
    setMapping((prev) => prev.map((m, i) => (i === index ? next : m)));
  }

  /** Rewrites the CSV's header row to canonical text per the user's mapping
   * choices, leaving every data row byte-for-byte untouched — a new `File`
   * with the same name is uploaded in place of the original selection. */
  function buildRemappedFile(): File {
    if (!parsedRows || !file) return file as File;
    const newHeaderRow = mapping.map((m, i) => {
      if (m.kind === "builtin") return BUILTIN_FIELD_CANONICAL_HEADER[m.field];
      if (m.kind === "custom") return m.fieldName;
      return parsedRows[0][i]; // "ignore" — leave as-is, server just won't recognize it either way
    });
    const rewritten = toCsv([newHeaderRow, ...parsedRows.slice(1)]);
    return new File([rewritten], file.name, { type: "text/csv" });
  }

  async function handleImport() {
    if (importMutation.isPending || !file || !effectiveColumnId) return; // guard double-submit
    setSubmitError(null);
    try {
      const uploadFile = isCsv && parsedRows ? buildRemappedFile() : file;
      const r = await importMutation.mutateAsync({
        file: uploadFile,
        columnId: effectiveColumnId,
        workspaceId,
        operatorId: operatorId || undefined,
      });
      setResult(r);
    } catch (err) {
      setSubmitError(leadActionErrorMessage(err));
    }
  }

  function reset() {
    setFile(null);
    setParsedRows(null);
    setMapping([]);
    setColumnId("");
    setOperatorId("");
    setFileError(null);
    setSubmitError(null);
    setResult(null);
  }

  const mappingOptions: { id: string; label: string }[] = [
    ...(Object.keys(BUILTIN_FIELD_LABELS) as ImportBuiltinField[]).map((f) => ({ id: `builtin:${f}`, label: BUILTIN_FIELD_LABELS[f] })),
    ...importableCustomFields.map((d) => ({ id: `custom:${d.field_name}`, label: `Custom field: ${d.field_name}` })),
    { id: "ignore", label: "Don't import this column" },
  ];

  function mappingToOptionId(m: ImportColumnMapping): string {
    if (m.kind === "builtin") return `builtin:${m.field}`;
    if (m.kind === "custom") return `custom:${m.fieldName}`;
    return "ignore";
  }

  function optionIdToMapping(id: string): ImportColumnMapping {
    if (id === "ignore") return { kind: "ignore" };
    if (id.startsWith("builtin:")) return { kind: "builtin", field: id.slice(8) as ImportBuiltinField };
    return { kind: "custom", fieldName: id.slice(7) };
  }

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading className="flex items-center gap-2">
                <ArrowUpFromSquare className="size-4" aria-hidden="true" />
                Import leads
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto">
              {result ? (
                <div className="rounded-lg border border-black/[0.08] bg-[var(--default)] p-4 text-sm dark:border-white/[0.12]">
                  <p className="mb-2 font-medium text-foreground">Import finished</p>
                  <ul className="space-y-1 text-foreground/70">
                    <li>Imported: {result.imported}</li>
                    <li>Skipped (row error): {result.skipped}</li>
                    <li>Skipped (duplicate phone): {result.duplicates}</li>
                    <li>Total rows read: {result.total}</li>
                    {result.columnsCreated > 0 ? <li>New stages created from &ldquo;Stage&rdquo; values: {result.columnsCreated}</li> : null}
                  </ul>
                </div>
              ) : (
                <>
                  <div className="rounded-lg border border-black/[0.08] bg-[var(--default)] p-3 dark:border-white/[0.12]">
                    <p className="mb-2 text-xs font-medium text-foreground/60">1. Download the sample template (optional)</p>
                    <Button size="sm" variant="secondary" isDisabled={sampleMutation.isPending} onPress={() => void handleDownloadSample()}>
                      <ArrowDownToSquare className="size-3.5" aria-hidden="true" />
                      {sampleMutation.isPending ? "Preparing…" : "Download sample .xlsx"}
                    </Button>
                    <p className="mt-1 text-xs text-foreground/40">
                      Includes your workspace&rsquo;s importable custom field columns, pre-filled example rows.
                    </p>
                  </div>

                  <div className="rounded-lg border border-black/[0.08] bg-[var(--default)] p-3 dark:border-white/[0.12]">
                    <p className="mb-2 text-xs font-medium text-foreground/60">2. Choose a file (.xlsx, .xls, or .csv — max 5 MB)</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                      className="hidden"
                      onChange={handleFileSelected}
                    />
                    <Button size="sm" variant="secondary" onPress={() => fileInputRef.current?.click()}>
                      <FileText className="size-3.5" aria-hidden="true" />
                      {file ? "Change file" : "Choose file"}
                    </Button>
                    {file ? <p className="mt-1 truncate text-xs text-foreground/60">{file.name}</p> : null}
                    {fileError ? (
                      <p role="alert" className="mt-1 text-sm text-danger">
                        {fileError}
                      </p>
                    ) : null}
                  </div>

                  {file && isCsv && parsedRows ? (
                    <div className="rounded-lg border border-black/[0.08] p-3 dark:border-white/[0.12]">
                      <p className="mb-2 text-xs font-medium text-foreground/60">
                        3. Confirm column mapping ({dataRowCount} data row{dataRowCount === 1 ? "" : "s"} detected)
                      </p>
                      <div className="flex flex-col gap-2">
                        {headers.map((h, i) => (
                          <div key={`${h}-${i}`} className="grid grid-cols-2 items-center gap-2">
                            <span className="truncate text-sm text-foreground/80" title={h}>
                              {h || <em className="text-foreground/40">(blank header)</em>}
                            </span>
                            <Select
                              aria-label={`Map column "${h}"`}
                              value={mappingToOptionId(mapping[i] ?? { kind: "ignore" })}
                              onChange={(key) => typeof key === "string" && updateMapping(i, optionIdToMapping(key))}
                            >
                              <Select.Trigger>
                                <Select.Value />
                                <Select.Indicator />
                              </Select.Trigger>
                              <Select.Popover>
                                <ListBox items={mappingOptions}>
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
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-foreground/40">
                        A name (or full name) column is required — the server rejects a file without one.
                      </p>
                    </div>
                  ) : file && !isCsv ? (
                    <p className="text-xs text-foreground/50">
                      Column mapping preview isn&rsquo;t available for Excel files — headers are auto-detected the same way on
                      upload (Name/Phone/Stage/Comment/Age/Marital status/Deadline/Created date, in any supported
                      language). Download the sample template above for the exact expected format.
                    </p>
                  ) : null}

                  {file ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <p className="mb-1 text-xs font-medium text-foreground/60">Target stage</p>
                        <Select
                          aria-label="Target stage"
                          value={effectiveColumnId || undefined}
                          placeholder={columns.length === 0 ? "No stages on this board" : "Choose a stage…"}
                          onChange={(key) => typeof key === "string" && setColumnId(key)}
                          isDisabled={columnsQuery.isLoading || columns.length === 0}
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
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-medium text-foreground/60">Assign operator (optional)</p>
                        <Select
                          aria-label="Assign operator"
                          value={operatorId || undefined}
                          placeholder="Unassigned"
                          onChange={(key) => typeof key === "string" && setOperatorId(key === "none" ? "" : key)}
                        >
                          <Select.Trigger>
                            <Select.Value />
                            <Select.Indicator />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox items={[{ id: "none", label: "Unassigned" }, ...operators]}>
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
                    </div>
                  ) : null}

                  {submitError ? (
                    <p role="alert" className="text-sm text-danger">
                      {submitError}
                    </p>
                  ) : null}
                </>
              )}
            </Modal.Body>
            <Modal.Footer>
              {result ? (
                <>
                  <Button variant="secondary" onPress={reset}>
                    Import another file
                  </Button>
                  <Button variant="primary" onPress={onClose}>
                    Done
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="secondary" onPress={onClose}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    isDisabled={importMutation.isPending || !file || !effectiveColumnId || Boolean(fileError)}
                    onPress={() => void handleImport()}
                  >
                    <ArrowUpFromSquare className="size-4" aria-hidden="true" />
                    {importMutation.isPending ? "Importing…" : "Import"}
                  </Button>
                </>
              )}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
