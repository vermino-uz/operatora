"use client";

import { useState } from "react";
import { ListBox, Select } from "@heroui/react";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { useFinanceAuditLogsQuery } from "@/features/finance/hooks/useFinance";
import { useSenderProfileMap } from "@/features/messages/hooks/useSenderProfileMap";

const ACTION_BADGE: Record<string, string> = {
  INSERT: "bg-success/15 text-success",
  UPDATE: "bg-primary/15 text-primary",
  DELETE: "bg-danger/15 text-danger",
};

function formatValues(values: Record<string, unknown> | null): string {
  if (!values) return "—";
  const entries = Object.entries(values).filter(([key]) => key !== "id" && key !== "created_at" && key !== "updated_at");
  if (entries.length === 0) return "—";
  return entries.map(([key, value]) => `${key}: ${String(value)}`).join(", ");
}

/** Read-only — no writer for this table exists client-side (see
 * `services/api/finance.ts`'s doc comment); shown for review/compliance
 * purposes only, matching the old `AuditLogsTab.tsx`'s bare list+filter UI
 * (minus its client-only `Table`/`ScrollArea` chrome). */
export function AuditLogTab({ workspaceId }: { workspaceId: string }) {
  const query = useFinanceAuditLogsQuery(workspaceId);
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");

  const logs = query.data ?? [];
  const userIds = [...new Set(logs.map((l) => l.user_id).filter((id): id is string => !!id))];
  const profileMap = useSenderProfileMap(userIds, workspaceId);

  if (query.isLoading) return <LoadingState label="Loading audit log…" className="py-16" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} className="py-16" />;

  const entityTypes = [...new Set(logs.map((l) => l.entity_type))];
  const actions = [...new Set(logs.map((l) => l.action))];
  const filtered = logs.filter((l) => {
    if (entityFilter !== "all" && l.entity_type !== entityFilter) return false;
    if (actionFilter !== "all" && l.action !== actionFilter) return false;
    return true;
  });

  const entityOptions = [{ id: "all", label: "All entities" }, ...entityTypes.map((t) => ({ id: t, label: t }))];
  const actionOptions = [{ id: "all", label: "All actions" }, ...actions.map((a) => ({ id: a, label: a }))];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-foreground/60">Most recent 100 finance change events, for review/compliance.</p>

      <div className="flex flex-wrap gap-2">
        <Select aria-label="Filter by entity" value={entityFilter} onChange={(key) => typeof key === "string" && setEntityFilter(key)} className="w-48">
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox items={entityOptions}>
              {(opt) => (
                <ListBox.Item id={opt.id} textValue={opt.label}>
                  {opt.label}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              )}
            </ListBox>
          </Select.Popover>
        </Select>
        <Select aria-label="Filter by action" value={actionFilter} onChange={(key) => typeof key === "string" && setActionFilter(key)} className="w-48">
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox items={actionOptions}>
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

      {filtered.length === 0 ? (
        <EmptyState title="No audit events yet" description="Finance change events will show up here." />
      ) : (
        <div className="max-h-[600px] overflow-auto">
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b border-divider">
                <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-muted">When</th>
                <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-muted">By</th>
                <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-muted">Action</th>
                <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-muted">Entity</th>
                <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-muted">Changes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr key={log.id} className="border-b border-divider/60">
                  <td className="whitespace-nowrap px-3 py-3 align-top text-sm text-foreground">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="px-3 py-3 align-top text-sm text-foreground">{log.user_id ? profileMap[log.user_id]?.name ?? "—" : "System"}</td>
                  <td className="px-3 py-3 align-top">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_BADGE[log.action.toUpperCase()] ?? "bg-foreground/10 text-foreground/70"}`}>
                      {log.action.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-top text-sm text-foreground">
                    {log.entity_type}
                    {log.entity_id ? <p className="font-mono text-xs text-foreground/60">{log.entity_id.slice(0, 8)}…</p> : null}
                  </td>
                  <td className="max-w-[320px] px-3 py-3 align-top text-xs text-foreground/70">
                    {log.action === "INSERT" ? formatValues(log.new_values) : null}
                    {log.action === "UPDATE" ? (
                      <>
                        <p>From: {formatValues(log.old_values)}</p>
                        <p>To: {formatValues(log.new_values)}</p>
                      </>
                    ) : null}
                    {log.action === "DELETE" ? formatValues(log.old_values) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
