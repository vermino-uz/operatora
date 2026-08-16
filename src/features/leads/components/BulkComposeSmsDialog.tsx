"use client";

import { useMemo, useState } from "react";
import { Button, ListBox, Modal, Select } from "@heroui/react";
import { Envelope } from "@gravity-ui/icons";

import { ApiError } from "@/types/api";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { useFilteredBulkPreviewQuery } from "@/features/leads/hooks/useFilteredBulkActions";
import { isAccountMissing, useEskizAccountQuery, useEskizGuidanceQuery, useEskizTemplatesQuery, useSendEskizBulkSmsMutation } from "@/features/leads/hooks/useEskizSms";
import { EMPTY_LEAD_FILTERS, type LeadBoardColumn } from "@/features/leads/types";

function bulkErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return error.message || "Bulk SMS is restricted to managers and admins.";
    if (error.isValidationError) return error.message;
    if (error.isNotFound) return error.message || "Template not found.";
    return "Something went wrong on our end. Please try again shortly.";
  }
  return "Something went wrong. Please try again.";
}

/**
 * Bulk compose SMS (Phase 2c-8) — "Compose SMS" from the Kanban board,
 * mirrors the old frontend's `ComposeSMSDialog.tsx` UX (stage chips + a
 * created-date range, real Eskiz template + balance/cost). Real, single
 * server-orchestrated send: `POST /eskiz/send/bulk`, not N client-side
 * calls — see `eskizSmsApi.sendBulk`'s doc comment. The recipient **count
 * preview** shown here reuses the existing Phase 2c-3 `leads-list.controller`
 * `bulk/preview` endpoint (`useFilteredBulkPreviewQuery`, same one
 * `FilteredBulkActionsDialog` uses) scoped to the chosen stages + date
 * range — an accurate estimate, not the authority: the send endpoint
 * re-resolves its own recipient list server-side from the same stage/date
 * inputs and is what actually gates on balance, same "operator estimate,
 * not the authority" framing the old frontend's own dialog used. Manager/
 * admin-only server-side (403 otherwise) — this dialog is only offered to
 * those roles from the Leads toolbar (see `LeadsPage`).
 */
export function BulkComposeSmsDialog({ boardId, columns, onClose }: { boardId: string; columns: LeadBoardColumn[]; onClose: () => void }) {
  const accountQuery = useEskizAccountQuery(true);
  const guidanceQuery = useEskizGuidanceQuery(Boolean(accountQuery.data));
  const templatesQuery = useEskizTemplatesQuery(Boolean(accountQuery.data));
  const sendBulk = useSendEskizBulkSmsMutation();

  const [templateId, setTemplateId] = useState("");
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ total: number } | null>(null);

  const approvedTemplates = useMemo(() => (templatesQuery.data ?? []).filter((t) => t.status === "approved"), [templatesQuery.data]);
  // No stage checked -> target every stage on the board (matches the old frontend).
  const effectiveColumns = selectedColumns.length ? selectedColumns : columns.map((c) => c.id);
  const fromIso = dateFrom ? new Date(`${dateFrom}T00:00:00`).toISOString() : null;
  const toIso = dateTo ? new Date(`${dateTo}T23:59:59`).toISOString() : null;

  const preview = useFilteredBulkPreviewQuery(
    { boardId, filters: { ...EMPTY_LEAD_FILTERS, dateFrom: fromIso, dateTo: toIso }, selectedColumns: effectiveColumns },
    Boolean(accountQuery.data) && effectiveColumns.length > 0,
  );
  const count = preview.data?.count ?? 0;
  const price = guidanceQuery.data?.sms_price_uzs ?? 0;
  const estimatedCost = count * price;
  const balance = accountQuery.data?.balance_uzs ?? 0;
  const insufficient = count > 0 && balance < estimatedCost;

  function toggleColumn(id: string) {
    setSelectedColumns((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  async function handleSend() {
    if (sendBulk.isPending || !templateId || count === 0 || insufficient) return; // guard double-submit + invalid state
    setError(null);
    try {
      const r = await sendBulk.mutateAsync({
        boardId,
        template_id: templateId,
        columnIds: effectiveColumns,
        dateFrom: fromIso,
        dateTo: toIso,
      });
      setResult({ total: r.total });
    } catch (err) {
      setError(bulkErrorMessage(err));
    }
  }

  const accountMissing = accountQuery.isError && isAccountMissing(accountQuery.error);
  const ready = !accountQuery.isLoading && !accountMissing && !result;

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading className="flex items-center gap-2">
                <Envelope className="size-4 text-primary" aria-hidden="true" />
                Compose SMS
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto">
              {accountQuery.isLoading ? <LoadingState label="Checking SMS gateway…" /> : null}

              {accountMissing ? (
                <EmptyState
                  title="SMS gateway not connected"
                  description="Connect a workspace Eskiz account in Settings → Eskiz before sending bulk SMS."
                />
              ) : null}

              {result ? (
                <EmptyState
                  title="Sending started"
                  description={`Sending to ${result.total.toLocaleString("ru-RU")} lead(s) in the background — delivery continues even after you close this.`}
                />
              ) : null}

              {ready ? (
                <>
                  <div>
                    <p className="mb-1 text-xs font-medium text-foreground/60">Template</p>
                    <Select
                      aria-label="Template"
                      value={templateId || undefined}
                      placeholder={approvedTemplates.length ? "Choose an approved template…" : "No approved templates"}
                      onChange={(key) => typeof key === "string" && setTemplateId(key)}
                      isDisabled={approvedTemplates.length === 0}
                    >
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox items={approvedTemplates.map((t) => ({ id: t.id, label: t.content.length > 60 ? `${t.content.slice(0, 60)}…` : t.content }))}>
                          {(opt) => (
                            <ListBox.Item id={opt.id} textValue={opt.label}>
                              {opt.label}
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          )}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                    {approvedTemplates.length === 0 && !templatesQuery.isLoading ? (
                      <p className="mt-1 text-xs text-foreground/50">No approved templates yet — submit one via SMS templates.</p>
                    ) : null}
                  </div>

                  <div>
                    <p className="mb-1 text-xs font-medium text-foreground/60">Stages (none = all)</p>
                    <div className="flex flex-wrap gap-1.5">
                      {columns.map((col) => {
                        const on = selectedColumns.includes(col.id);
                        return (
                          <button
                            key={col.id}
                            type="button"
                            onClick={() => toggleColumn(col.id)}
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

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="mb-1 text-xs font-medium text-foreground/60">Created from</p>
                      <input
                        type="date"
                        value={dateFrom}
                        max={dateTo || undefined}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="h-9 w-full rounded-lg border border-black/[0.08] bg-transparent px-3 text-sm text-foreground dark:border-white/[0.12]"
                      />
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-medium text-foreground/60">Created to</p>
                      <input
                        type="date"
                        value={dateTo}
                        min={dateFrom || undefined}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="h-9 w-full rounded-lg border border-black/[0.08] bg-transparent px-3 text-sm text-foreground dark:border-white/[0.12]"
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border border-black/[0.08] bg-[var(--default)] p-3 text-sm dark:border-white/[0.12]">
                    <div className="flex justify-between">
                      <span className="text-foreground/60">Recipients</span>
                      <span className="font-semibold text-foreground">{preview.isFetching ? "…" : count.toLocaleString("ru-RU")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-foreground/60">Estimated cost</span>
                      <span className="font-semibold text-foreground">{estimatedCost.toLocaleString("ru-RU")} UZS</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-foreground/60">Balance</span>
                      <span className={insufficient ? "font-semibold text-danger" : "font-semibold text-foreground"}>
                        {balance.toLocaleString("ru-RU")} UZS
                      </span>
                    </div>
                    {insufficient ? <p className="mt-1 text-xs text-danger">Balance too low for this send — top up or narrow the filter.</p> : null}
                  </div>

                  {error ? (
                    <p role="alert" className="text-sm text-danger">
                      {error}
                    </p>
                  ) : null}
                </>
              ) : null}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={onClose}>
                {result || accountMissing ? "Close" : "Cancel"}
              </Button>
              {ready ? (
                <Button
                  variant="primary"
                  isDisabled={sendBulk.isPending || !templateId || count === 0 || insufficient}
                  onPress={handleSend}
                >
                  {sendBulk.isPending ? "Sending…" : `Send to ${count.toLocaleString("ru-RU")} lead(s)`}
                </Button>
              ) : null}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
