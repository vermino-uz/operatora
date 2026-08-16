"use client";

import { Button } from "@heroui/react";
import { ArrowRotateLeft, ChevronLeft, ChevronRight, CircleXmark } from "@gravity-ui/icons";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatLeadName, type LeadFilters, type LeadRow } from "@/features/leads/types";
import { REJECTED_PAGE_SIZE, useRejectedLeadsQuery, useRestoreRejectedLeadMutation } from "@/features/leads/hooks/useRejectedLeads";

/** Rejected tab — 0-indexed server-side pagination (fixed 100/page), see
 * `rejectedLeadsApi.list`'s doc comment. Plain semantic `<table>`, same
 * style as `LeadsListTable`/`SoldLeadsTable`. */
export function RejectedLeadsTable({
  boardId,
  filters,
  page,
  onPageChange,
  onOpenLead,
}: {
  boardId: string;
  filters: LeadFilters;
  page: number;
  onPageChange: (page: number) => void;
  onOpenLead: (lead: LeadRow) => void;
}) {
  const query = useRejectedLeadsQuery(boardId, page, filters);
  const restore = useRestoreRejectedLeadMutation(boardId);

  if (query.isLoading) return <LoadingState label="Loading rejected leads…" className="flex-1" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

  if (items.length === 0) {
    return <EmptyState title="No rejected leads" description="Leads marked as rejected will show up here." />;
  }

  const from = page * REJECTED_PAGE_SIZE + 1;
  const to = Math.min((page + 1) * REJECTED_PAGE_SIZE, total);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      <table className="w-full border-collapse text-left">
        <thead className="sticky top-0 z-10 bg-background">
          <tr className="border-b border-divider">
            <th className="whitespace-nowrap px-4 py-2 text-xs font-medium text-muted">Name</th>
            <th className="whitespace-nowrap px-4 py-2 text-xs font-medium text-muted">Stage</th>
            <th className="whitespace-nowrap px-4 py-2 text-xs font-medium text-muted">Rejected at</th>
            <th className="whitespace-nowrap px-4 py-2 text-xs font-medium text-muted">Rejected by</th>
            <th className="whitespace-nowrap px-4 py-2 text-xs font-medium text-muted">Reason</th>
            <th className="whitespace-nowrap px-4 py-2 text-xs font-medium text-muted">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((lead) => (
            <tr key={lead.id} className="border-b border-divider/60 hover:bg-[var(--default)]">
              <td className="cursor-pointer px-4 py-3 align-top" onClick={() => onOpenLead(lead)}>
                <p className="text-sm font-medium text-foreground">{formatLeadName(lead)}</p>
                {lead.phone_number ? <p className="font-mono text-xs text-muted">{lead.phone_number}</p> : null}
              </td>
              <td className="px-4 py-3 align-top text-sm text-foreground">{lead.column?.name ?? "—"}</td>
              <td className="px-4 py-3 align-top text-sm text-foreground">
                {lead.rejected_at ? new Date(lead.rejected_at).toLocaleString() : "—"}
              </td>
              <td className="px-4 py-3 align-top text-sm text-foreground">
                {lead.rejected_by_profile?.full_name || lead.rejected_by_profile?.email || "—"}
              </td>
              <td className="max-w-[220px] truncate px-4 py-3 align-top text-sm text-foreground" title={lead.rejected_reason ?? ""}>
                {lead.rejected_reason || "—"}
              </td>
              <td className="px-4 py-3 align-top">
                <Button size="sm" variant="secondary" isDisabled={restore.isPending} onPress={() => restore.mutate(lead.id)}>
                  <ArrowRotateLeft className="size-3.5" aria-hidden="true" />
                  Restore
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-center justify-between px-4 py-3">
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <CircleXmark className="size-3.5" aria-hidden="true" />
          {total === 0 ? "0 results" : `${from}–${to} of ${total}`}
        </p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" isDisabled={page <= 0} onPress={() => onPageChange(Math.max(0, page - 1))}>
            <ChevronLeft className="size-4" aria-hidden="true" />
            Prev
          </Button>
          <Button size="sm" variant="secondary" isDisabled={to >= total} onPress={() => onPageChange(page + 1)}>
            Next
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
