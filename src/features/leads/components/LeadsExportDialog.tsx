"use client";

import { useState } from "react";
import { Button, Modal } from "@heroui/react";
import { ArrowDownToSquare, ArrowUpRightFromSquare } from "@gravity-ui/icons";

import { leadActionErrorMessage } from "@/features/leads/leadActionError";
import { RowCheckbox } from "@/features/leads/components/RowCheckbox";
import { useLeadExportMutation } from "@/features/leads/hooks/useLeadExport";
import { useLeadCustomFieldsQuery } from "@/features/leads/hooks/useLeadCustomFields";
import { STANDARD_EXPORT_COLUMNS, buildExportCsv, type StandardExportColumnKey } from "@/features/leads/leadExportCsv";
import { downloadTextFile } from "@/lib/csv";
import type { LeadBoardColumn, LeadFilters } from "@/features/leads/types";

const ALL_STANDARD_KEYS = new Set<StandardExportColumnKey>(STANDARD_EXPORT_COLUMNS.map((c) => c.key));

/**
 * CSV export (Phase 2c-9) — real `GET /leads-list/export`, respecting the
 * board's currently-active filters (passed in from `LeadsPage`, never
 * re-derived/edited here — matches the brief's "respecting the currently-
 * active filters" scope, deliberately not the old frontend's larger
 * re-filter-inside-the-dialog UX). Two real, independent scoping controls:
 * pipeline stages (the backend's actual `selectedColumns` param) and an
 * output column picker (standard fields + registered custom fields), the
 * latter a client-side reshape of the real server response — see
 * `leadExportCsv.ts`'s header comment for exactly where the real/client
 * boundary sits.
 */
export function LeadsExportDialog({
  boardId,
  columns,
  filters,
  onClose,
}: {
  boardId: string;
  columns: LeadBoardColumn[];
  filters: LeadFilters;
  onClose: () => void;
}) {
  const exportMutation = useLeadExportMutation();
  const customFieldsQuery = useLeadCustomFieldsQuery();
  const customFieldDefs = customFieldsQuery.data ?? [];

  const [selectedStages, setSelectedStages] = useState<Set<string>>(new Set());
  const [standardColumns, setStandardColumns] = useState<Set<StandardExportColumnKey>>(new Set(ALL_STANDARD_KEYS));
  const [expandCustomFields, setExpandCustomFields] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ rowCount: number } | null>(null);

  const effectiveStages = selectedStages.size > 0 ? Array.from(selectedStages) : undefined;

  function toggleStage(id: string) {
    setSelectedStages((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleStandard(key: StandardExportColumnKey) {
    setStandardColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleExport() {
    if (exportMutation.isPending || standardColumns.size === 0) return; // guard double-submit + empty selection
    setError(null);
    setResult(null);
    try {
      const server = await exportMutation.mutateAsync({ boardId, filters, selectedColumns: effectiveStages });
      const { csv, rowCount } = buildExportCsv(server.csv, { standardColumns, expandCustomFields, customFieldDefs });
      if (rowCount === 0) {
        setError("No leads match the current filters — nothing to export.");
        return;
      }
      downloadTextFile(csv, server.filename, "text/csv;charset=utf-8");
      setResult({ rowCount });
    } catch (err) {
      setError(leadActionErrorMessage(err));
    }
  }

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading className="flex items-center gap-2">
                <ArrowDownToSquare className="size-4" aria-hidden="true" />
                Export leads (CSV)
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto">
              <p className="text-sm text-foreground/70">
                Exports every lead matching the filters currently applied to the board (search, status, date range,
                assignment, …). Change the filter bar behind this dialog before exporting to change what&rsquo;s included.
              </p>

              <div>
                <p className="mb-1.5 text-xs font-medium text-foreground/60">Pipeline stages (none checked = every stage)</p>
                <div className="flex flex-wrap gap-1.5">
                  {columns.map((col) => {
                    const on = selectedStages.has(col.id);
                    return (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => toggleStage(col.id)}
                        className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                          on
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-black/[0.08] text-foreground/70 hover:bg-black/[0.03] dark:border-white/[0.12] dark:hover:bg-white/[0.05]"
                        }`}
                      >
                        {col.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-xs font-medium text-foreground/60">Standard columns</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
                  {STANDARD_EXPORT_COLUMNS.map((col) => (
                    <label key={col.key} className="flex items-center gap-2 text-sm">
                      <RowCheckbox
                        checked={standardColumns.has(col.key)}
                        onChange={() => toggleStandard(col.key)}
                        label={col.label}
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-xs font-medium text-foreground/60">Custom fields</p>
                <label className="flex items-center gap-2 text-sm">
                  <RowCheckbox
                    checked={expandCustomFields}
                    onChange={() => setExpandCustomFields((v) => !v)}
                    label="Expand custom fields into columns"
                  />
                  Expand into one column per custom field{customFieldDefs.length > 0 ? ` (${customFieldDefs.length} defined)` : ""}
                </label>
                <p className="mt-1 text-xs text-foreground/40">
                  Unchecked: all custom field values stay together as one raw JSON column, exactly as the server returns them.
                </p>
              </div>

              {standardColumns.size === 0 ? (
                <p role="alert" className="text-sm text-danger">
                  Select at least one standard column.
                </p>
              ) : null}
              {error ? (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              ) : null}
              {result ? (
                <p className="text-sm text-success">Exported {result.rowCount.toLocaleString("ru-RU")} lead(s).</p>
              ) : null}

              <a
                href="/settings?section=google-sheets"
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                Need an ongoing sync instead of a one-time file? Connect Google Sheets in Settings
                <ArrowUpRightFromSquare className="size-3" aria-hidden="true" />
              </a>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={onClose}>
                Close
              </Button>
              <Button
                variant="primary"
                isDisabled={exportMutation.isPending || standardColumns.size === 0}
                onPress={() => void handleExport()}
              >
                {exportMutation.isPending ? "Exporting…" : "Download CSV"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
