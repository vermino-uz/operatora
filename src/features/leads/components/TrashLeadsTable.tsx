"use client";

import { Button } from "@heroui/react";
import { ArrowRotateLeft, TrashBin } from "@gravity-ui/icons";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatLeadName } from "@/features/leads/types";
import { usePermanentlyDeleteLeadMutation, useRestoreTrashLeadMutation, useTrashQuery } from "@/features/leads/hooks/useTrash";

/** Trash tab — workspace-scoped, not board-scoped (see `trashApi`'s doc
 * comment: a soft-deleted lead can be from any board on any pipeline). No
 * "open details" action — a soft-deleted lead's board/column context may no
 * longer be navigable, matching the old frontend's `TrashLeadsList.tsx`
 * (row click doesn't open `LeadDetailsDialog` there either). */
export function TrashLeadsTable({ workspaceId }: { workspaceId: string }) {
  const query = useTrashQuery(workspaceId);
  const restore = useRestoreTrashLeadMutation(workspaceId);
  const permanentlyDelete = usePermanentlyDeleteLeadMutation(workspaceId);

  if (query.isLoading) return <LoadingState label="Loading trash…" className="flex-1" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  const leads = query.data ?? [];
  if (leads.length === 0) {
    return <EmptyState title="Trash is empty" description="Deleted leads will show up here, recoverable until permanently removed." />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      <table className="w-full border-collapse text-left">
        <thead className="sticky top-0 z-10 bg-background">
          <tr className="border-b border-divider">
            <th className="whitespace-nowrap px-4 py-2 text-xs font-medium text-muted">Name</th>
            <th className="whitespace-nowrap px-4 py-2 text-xs font-medium text-muted">Operator</th>
            <th className="whitespace-nowrap px-4 py-2 text-xs font-medium text-muted">Deleted from stage</th>
            <th className="whitespace-nowrap px-4 py-2 text-xs font-medium text-muted">Deleted at</th>
            <th className="whitespace-nowrap px-4 py-2 text-xs font-medium text-muted">Deleted by</th>
            <th className="whitespace-nowrap px-4 py-2 text-xs font-medium text-muted">Actions</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => {
            const pending = restore.isPending || permanentlyDelete.isPending;
            return (
              <tr key={lead.id} className="border-b border-divider/60">
                <td className="px-4 py-3 align-top">
                  <p className="text-sm font-medium text-foreground">{formatLeadName(lead)}</p>
                  {lead.phone_number ? <p className="font-mono text-xs text-muted">{lead.phone_number}</p> : null}
                </td>
                <td className="px-4 py-3 align-top text-sm text-foreground">{lead.operators?.operator_name ?? "—"}</td>
                <td className="px-4 py-3 align-top text-sm text-foreground">{lead.column?.name ?? "—"}</td>
                <td className="px-4 py-3 align-top text-sm text-foreground">
                  {lead.deleted_at ? new Date(lead.deleted_at).toLocaleString() : "—"}
                </td>
                <td className="px-4 py-3 align-top text-sm text-foreground">
                  {lead.deleted_by_profile?.full_name || lead.deleted_by_profile?.email || "—"}
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" isDisabled={pending} onPress={() => restore.mutate(lead.id)}>
                      <ArrowRotateLeft className="size-3.5" aria-hidden="true" />
                      Restore
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      isDisabled={pending}
                      onPress={() => {
                        if (window.confirm("Permanently delete this lead? This cannot be undone.")) {
                          permanentlyDelete.mutate(lead.id);
                        }
                      }}
                    >
                      <TrashBin className="size-3.5 text-danger" aria-hidden="true" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
