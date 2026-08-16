"use client";

import { Button } from "@heroui/react";
import { ArrowRotateLeft, Medal, TrashBin } from "@gravity-ui/icons";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatLeadName, type LeadRow } from "@/features/leads/types";
import { useSessionStore } from "@/state/session-store";
import { hasAnyRole, MANAGER_ROLES } from "@/auth/permissions";
import { useDeleteLeadMutation, useRestoreSoldLeadMutation, useSoldLeadsQuery } from "@/features/leads/hooks/useSoldLeads";

/** Sold tab — plain semantic `<table>`, matching `ConversationsTable`'s/
 * `LeadsListTable`'s style even though this endpoint has no server-side
 * pagination to drive a TanStack Table instance off of (see
 * `soldLeadsApi.list`'s doc comment — the full unfiltered list comes back
 * in one response, same as the old frontend). */
export function SoldLeadsTable({ boardId, onOpenLead }: { boardId: string; onOpenLead: (lead: LeadRow) => void }) {
  const roles = useSessionStore((s) => s.roles);
  const canDelete = hasAnyRole(roles, MANAGER_ROLES);
  const query = useSoldLeadsQuery(boardId);
  const restore = useRestoreSoldLeadMutation(boardId);
  const remove = useDeleteLeadMutation(boardId);

  if (query.isLoading) return <LoadingState label="Loading sold leads…" className="flex-1" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  const leads = query.data ?? [];
  if (leads.length === 0) {
    return <EmptyState title="No sold leads yet" description="Leads marked as sold will show up here." />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      <table className="w-full border-collapse text-left">
        <thead className="sticky top-0 z-10 bg-background">
          <tr className="border-b border-divider">
            <th className="whitespace-nowrap px-4 py-2 text-xs font-medium text-muted">Name</th>
            <th className="whitespace-nowrap px-4 py-2 text-xs font-medium text-muted">Stage</th>
            <th className="whitespace-nowrap px-4 py-2 text-xs font-medium text-muted">Sold at</th>
            <th className="whitespace-nowrap px-4 py-2 text-xs font-medium text-muted">Sold by</th>
            <th className="whitespace-nowrap px-4 py-2 text-xs font-medium text-muted">Note</th>
            <th className="whitespace-nowrap px-4 py-2 text-xs font-medium text-muted">Actions</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-b border-divider/60 hover:bg-[var(--default)]">
              <td className="cursor-pointer px-4 py-3 align-top" onClick={() => onOpenLead(lead)}>
                <p className="text-sm font-medium text-foreground">{formatLeadName(lead)}</p>
                {lead.phone_number ? <p className="font-mono text-xs text-muted">{lead.phone_number}</p> : null}
              </td>
              <td className="px-4 py-3 align-top text-sm text-foreground">{lead.column?.name ?? "—"}</td>
              <td className="px-4 py-3 align-top text-sm text-foreground">
                {lead.sold_at ? new Date(lead.sold_at).toLocaleString() : "—"}
              </td>
              <td className="px-4 py-3 align-top text-sm text-foreground">
                {lead.sold_by_profile?.full_name || lead.sold_by_profile?.email || "—"}
              </td>
              <td className="max-w-[220px] truncate px-4 py-3 align-top text-sm text-foreground" title={lead.sold_note ?? ""}>
                {lead.sold_note || "—"}
              </td>
              <td className="px-4 py-3 align-top">
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" isDisabled={restore.isPending} onPress={() => restore.mutate(lead.id)}>
                    <ArrowRotateLeft className="size-3.5" aria-hidden="true" />
                    Restore
                  </Button>
                  {canDelete ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      isDisabled={remove.isPending}
                      onPress={() => {
                        if (window.confirm("Permanently move this lead to Trash?")) remove.mutate(lead.id);
                      }}
                    >
                      <TrashBin className="size-3.5 text-danger" aria-hidden="true" />
                    </Button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-1.5 px-4 py-3 text-xs text-muted">
        <Medal className="size-3.5" aria-hidden="true" />
        {leads.length} sold lead{leads.length === 1 ? "" : "s"}
      </div>
    </div>
  );
}
