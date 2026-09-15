"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Button, Tabs } from "@heroui/react";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { AdminSectionCard } from "@/features/admin/components/AdminSectionCard";
import { AdminKpiCard } from "@/features/admin/components/AdminKpiCard";
import { formatDate, formatNumber, formatUsdCents } from "@/features/admin/formatters";
import {
  useAdminWorkspaceBillingQuery,
  useAdminWorkspaceConversationsQuery,
  useAdminWorkspaceEntitlementsQuery,
  useAdminWorkspaceIntegrationsQuery,
  useAdminWorkspaceLeadsQuery,
  useAdminWorkspaceQuery,
  useAdminWorkspaceUsersQuery,
  useDeleteAdminWorkspaceMutation,
  useExtendAdminSubscriptionMutation,
  useReactivateAdminWorkspaceMutation,
  useSuspendAdminWorkspaceMutation,
  useUpdateAdminWorkspaceEntitlementsMutation,
} from "@/features/admin/hooks/useAdminWorkspaces";
import { useRouter } from "next/navigation";

type EntitlementBoolKey =
  | "telegram_agentic_enabled"
  | "instagram_agentic_enabled"
  | "voice_enabled"
  | "gsm_sim_enabled"
  | "telegram_channel_enabled"
  | "instagram_channel_enabled"
  | "sms_channel_enabled"
  | "whatsapp_channel_enabled"
  | "multi_channel_agent_enabled";

/**
 * `/admin/workspaces/:id` — real, confirmed against
 * `admin-workspaces.controller.ts` + `admin-workspace-detail.service.ts`.
 * Ported from the old `pages/WorkspaceDetail.tsx` (1767 lines of shadcn
 * tabs/dialogs) as a single tabbed page with the same real sub-resources
 * (Overview/Users/Leads/Conversations/Integrations/Billing/Entitlements)
 * but leaner markup — per the task brief, this doesn't need pixel parity
 * with the old shadcn UI, just real data + correct behavior.
 */
export default function AdminWorkspaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const detail = useAdminWorkspaceQuery(id);
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const suspendM = useSuspendAdminWorkspaceMutation();
  const reactivateM = useReactivateAdminWorkspaceMutation();
  const deleteM = useDeleteAdminWorkspaceMutation();

  if (detail.isLoading) return <LoadingState label="Loading workspace…" className="py-16" />;
  if (detail.isError) return <ErrorState error={detail.error} onRetry={() => detail.refetch()} className="py-16" />;
  const ws = detail.data;
  if (!ws) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/workspaces" className="text-xs text-foreground/50 hover:text-foreground">
            ← Workspaces
          </Link>
          <h1 className="text-xl font-semibold text-foreground">{ws.name}</h1>
          <p className="text-sm text-foreground/60">
            {ws.slug ? `@${ws.slug} · ` : ""}
            {ws.ownerEmail ?? "no owner"} · <span className="capitalize">{ws.tier ?? "—"}</span> ·{" "}
            <span className="capitalize">{ws.status ?? "—"}</span>
          </p>
        </div>
        <div className="flex gap-2">
          {ws.status === "suspended" ? (
            <Button size="sm" variant="secondary" onPress={() => reactivateM.mutate(ws.id)}>
              Reactivate
            </Button>
          ) : (
            <Button size="sm" variant="secondary" onPress={() => setConfirmSuspend(true)}>
              Suspend
            </Button>
          )}
          <Button size="sm" variant="danger" onPress={() => setConfirmDelete(true)}>
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <AdminKpiCard label="Users" value={formatNumber(ws.counts.users)} />
        <AdminKpiCard label="Leads" value={formatNumber(ws.counts.leads)} />
        <AdminKpiCard label="Conversations" value={formatNumber(ws.counts.conversations)} />
      </div>

      <Tabs defaultSelectedKey="overview">
        <Tabs.List>
          <Tabs.Tab id="overview">Overview</Tabs.Tab>
          <Tabs.Tab id="users">Users</Tabs.Tab>
          <Tabs.Tab id="leads">Leads</Tabs.Tab>
          <Tabs.Tab id="conversations">Conversations</Tabs.Tab>
          <Tabs.Tab id="integrations">Integrations</Tabs.Tab>
          <Tabs.Tab id="billing">Billing</Tabs.Tab>
          <Tabs.Tab id="entitlements">Entitlements</Tabs.Tab>
        </Tabs.List>
        <div className="pt-4">
          <Tabs.Panel id="overview">
            <OverviewTab ws={ws} />
          </Tabs.Panel>
          <Tabs.Panel id="users">
            <UsersTab id={id} />
          </Tabs.Panel>
          <Tabs.Panel id="leads">
            <LeadsTab id={id} />
          </Tabs.Panel>
          <Tabs.Panel id="conversations">
            <ConversationsTab id={id} />
          </Tabs.Panel>
          <Tabs.Panel id="integrations">
            <IntegrationsTab id={id} />
          </Tabs.Panel>
          <Tabs.Panel id="billing">
            <BillingTab id={id} />
          </Tabs.Panel>
          <Tabs.Panel id="entitlements">
            <EntitlementsTab id={id} />
          </Tabs.Panel>
        </div>
      </Tabs>

      <ConfirmDialog
        isOpen={confirmSuspend}
        title="Suspend workspace"
        description={`${ws.name}'s members will lose access until reactivated.`}
        confirmLabel="Suspend"
        isDanger
        isLoading={suspendM.isPending}
        onClose={() => setConfirmSuspend(false)}
        onConfirm={() => suspendM.mutate({ id: ws.id }, { onSuccess: () => setConfirmSuspend(false) })}
      />
      <ConfirmDialog
        isOpen={confirmDelete}
        title="Delete workspace"
        description={`${ws.name} and all its data will be permanently deleted. This can't be undone.`}
        confirmLabel="Delete"
        isDanger
        isLoading={deleteM.isPending}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => deleteM.mutate(ws.id, { onSuccess: () => router.push("/admin/workspaces") })}
      />
    </div>
  );
}

function OverviewTab({ ws }: { ws: NonNullable<ReturnType<typeof useAdminWorkspaceQuery>["data"]> }) {
  const extendM = useExtendAdminSubscriptionMutation();
  return (
    <AdminSectionCard
      title="Details"
      action={
        <Button size="sm" variant="secondary" onPress={() => extendM.mutate({ id: ws.id, days: 30 })} isDisabled={extendM.isPending}>
          Extend subscription +30d
        </Button>
      }
    >
      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <Row label="Created" value={formatDate(ws.createdAt)} />
        <Row label="Trial ends" value={formatDate(ws.trialEndsAt)} />
        <Row label="Suspended at" value={formatDate(ws.suspendedAt)} />
        <Row label="Suspended reason" value={ws.suspendedReason ?? "—"} />
        <Row label="AI spend (30d)" value={formatUsdCents(ws.aiUsage30d.costUsdCents)} />
        <Row label="Tokens (30d)" value={`${formatNumber(ws.aiUsage30d.inputTokens)} in / ${formatNumber(ws.aiUsage30d.outputTokens)} out`} />
        <Row label="Max desktop sessions" value={ws.maxDesktopSessions ?? "default"} />
        <Row label="Max mobile sessions" value={ws.maxMobileSessions ?? "default"} />
        <Row label="Max web sessions" value={ws.maxWebSessions ?? "default"} />
      </dl>
    </AdminSectionCard>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-xs text-foreground/50">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}

function UsersTab({ id }: { id: string }) {
  const query = useAdminWorkspaceUsersQuery(id);
  if (query.isLoading) return <LoadingState label="Loading users…" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  const rows = query.data?.rows ?? [];
  if (rows.length === 0) return <EmptyState title="No members" />;
  return (
    <div className="overflow-x-auto rounded-md border border-divider">
      <table className="w-full min-w-[700px] border-collapse text-left">
        <thead className="bg-foreground/5">
          <tr>
            {["Name", "Email", "Role", "Joined", "Status"].map((h) => (
              <th key={h} className="px-3 py-2 text-xs font-medium text-foreground/60">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <tr key={u.id} className="border-t border-divider/60">
              <td className="px-3 py-2 text-sm text-foreground">
                <Link href={`/admin/users/${u.userId}`} className="hover:underline">
                  {u.fullName ?? "—"}
                </Link>
              </td>
              <td className="px-3 py-2 text-sm text-foreground/70">{u.email}</td>
              <td className="px-3 py-2 text-sm capitalize text-foreground/70">{u.role}</td>
              <td className="px-3 py-2 text-sm text-foreground/50">{formatDate(u.joinedAt)}</td>
              <td className="px-3 py-2 text-sm text-foreground/70">{u.lockedUntil ? "Locked" : u.isActive ? "Active" : "Inactive"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LeadsTab({ id }: { id: string }) {
  const [page, setPage] = useState(1);
  const query = useAdminWorkspaceLeadsQuery(id, page);
  if (query.isLoading) return <LoadingState label="Loading leads…" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  const rows = query.data?.rows ?? [];
  if (rows.length === 0) return <EmptyState title="No leads" />;
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-md border border-divider">
        <table className="w-full min-w-[600px] border-collapse text-left">
          <thead className="bg-foreground/5">
            <tr>
              {["Name", "Phone", "Created", "Archived"].map((h) => (
                <th key={h} className="px-3 py-2 text-xs font-medium text-foreground/60">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id} className="border-t border-divider/60">
                <td className="px-3 py-2 text-sm text-foreground">{l.name}</td>
                <td className="px-3 py-2 text-sm text-foreground/70">{l.phone ?? "—"}</td>
                <td className="px-3 py-2 text-sm text-foreground/50">{formatDate(l.createdAt)}</td>
                <td className="px-3 py-2 text-sm text-foreground/70">{l.archived ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {query.data ? (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" isDisabled={page <= 1} onPress={() => setPage((p) => p - 1)}>
            Prev
          </Button>
          <Button size="sm" variant="secondary" isDisabled={rows.length < query.data.perPage} onPress={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ConversationsTab({ id }: { id: string }) {
  const [page, setPage] = useState(1);
  const query = useAdminWorkspaceConversationsQuery(id, page);
  if (query.isLoading) return <LoadingState label="Loading conversations…" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  const rows = query.data?.rows ?? [];
  if (rows.length === 0) return <EmptyState title="No conversations" />;
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-md border border-divider">
        <table className="w-full min-w-[700px] border-collapse text-left">
          <thead className="bg-foreground/5">
            <tr>
              {["Operator", "Phone", "Duration", "AI score", "Sentiment", "Created"].map((h) => (
                <th key={h} className="px-3 py-2 text-xs font-medium text-foreground/60">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-divider/60">
                <td className="px-3 py-2 text-sm text-foreground">{c.operatorName ?? "—"}</td>
                <td className="px-3 py-2 text-sm text-foreground/70">{c.clientPhone ?? "—"}</td>
                <td className="px-3 py-2 text-sm text-foreground/70">{c.durationSeconds ? `${c.durationSeconds}s` : "—"}</td>
                <td className="px-3 py-2 text-sm text-foreground/70">{c.aiScore ?? "—"}</td>
                <td className="px-3 py-2 text-sm capitalize text-foreground/70">{c.sentiment ?? "—"}</td>
                <td className="px-3 py-2 text-sm text-foreground/50">{formatDate(c.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {query.data ? (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" isDisabled={page <= 1} onPress={() => setPage((p) => p - 1)}>
            Prev
          </Button>
          <Button size="sm" variant="secondary" isDisabled={rows.length < query.data.perPage} onPress={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function IntegrationsTab({ id }: { id: string }) {
  const query = useAdminWorkspaceIntegrationsQuery(id);
  if (query.isLoading) return <LoadingState label="Loading integrations…" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  const data = query.data;
  if (!data) return null;
  const groups: Array<{ label: string; items: Array<{ id: string; label: string; active: boolean }> }> = [
    { label: "Telegram bots", items: data.telegram.map((t) => ({ id: t.id, label: t.bot_username ?? t.id, active: t.is_active })) },
    { label: "SIP", items: data.sip.map((s) => ({ id: s.id, label: `${s.sip_number} (${s.server})`, active: s.is_active })) },
    { label: "GSM lines", items: data.gsm.map((g) => ({ id: g.id, label: g.line_name ?? g.sim_number, active: g.is_active })) },
  ];
  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => (
        <div key={g.label}>
          <h3 className="mb-2 text-sm font-medium text-foreground">{g.label}</h3>
          {g.items.length === 0 ? (
            <p className="text-sm text-foreground/50">None connected.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {g.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between rounded-md border border-divider px-3 py-2 text-sm">
                  <span className="text-foreground">{item.label}</span>
                  <span className={item.active ? "text-success" : "text-foreground/40"}>{item.active ? "Active" : "Inactive"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

function BillingTab({ id }: { id: string }) {
  const query = useAdminWorkspaceBillingQuery(id);
  if (query.isLoading) return <LoadingState label="Loading billing…" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  const b = query.data;
  if (!b) return null;
  return (
    <AdminSectionCard title="Subscription">
      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <Row label="Tier" value={b.subscription.tier ?? "—"} />
        <Row label="Status" value={b.subscription.status ?? "—"} />
        <Row label="Trial ends" value={formatDate(b.subscription.trialEndsAt)} />
        <Row label="Subscription ends" value={formatDate(b.subscription.subscriptionEndsAt)} />
        <Row label="Grace ends" value={formatDate(b.subscription.graceEndsAt)} />
        <Row label="Suspended at" value={formatDate(b.subscription.suspendedAt)} />
        <Row label="Suspended reason" value={b.subscription.suspendedReason ?? "—"} />
        <Row label="AI spend (30d)" value={formatUsdCents(b.usage30d.costUsdCents)} />
      </dl>
    </AdminSectionCard>
  );
}

function EntitlementsTab({ id }: { id: string }) {
  const query = useAdminWorkspaceEntitlementsQuery(id);
  const updateM = useUpdateAdminWorkspaceEntitlementsMutation();
  if (query.isLoading) return <LoadingState label="Loading entitlements…" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  const e = query.data;

  const toggles: Array<{ key: EntitlementBoolKey; label: string }> = [
    { key: "telegram_agentic_enabled", label: "Telegram AI agent" },
    { key: "instagram_agentic_enabled", label: "Instagram AI agent" },
    { key: "voice_enabled", label: "Voice (TTS) replies" },
    { key: "gsm_sim_enabled", label: "GSM SIM integration" },
    { key: "telegram_channel_enabled", label: "Telegram channel" },
    { key: "instagram_channel_enabled", label: "Instagram channel" },
    { key: "sms_channel_enabled", label: "SMS channel" },
    { key: "whatsapp_channel_enabled", label: "WhatsApp channel" },
    { key: "multi_channel_agent_enabled", label: "Multi-channel agent" },
  ];

  return (
    <AdminSectionCard title="Feature overrides (beyond plan tier)">
      <p className="mb-3 text-xs text-foreground/50">
        Grants/denials here override the workspace&apos;s plan tier regardless of billing status. Toggling sets an
        explicit override with no expiry; use the workspace&apos;s plan tier itself for permanent changes.
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {toggles.map((t) => {
          const value: boolean | null | undefined = e ? e[t.key] : undefined;
          return (
            <button
              key={t.key}
              type="button"
              disabled={updateM.isPending}
              onClick={() => updateM.mutate({ id, patch: { [t.key]: !value } })}
              className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
                value ? "border-success/40 bg-success/10 text-success" : "border-divider text-foreground/70"
              }`}
            >
              <span>{t.label}</span>
              <span className="text-xs">{value ? "Granted" : "Inherit tier"}</span>
            </button>
          );
        })}
      </div>
      {e?.notes ? <p className="mt-3 text-xs text-foreground/50">Notes: {e.notes}</p> : null}
    </AdminSectionCard>
  );
}
