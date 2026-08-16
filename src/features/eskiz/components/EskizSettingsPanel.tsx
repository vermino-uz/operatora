"use client";

import { useState } from "react";
import { Button, Chip, Input, Label, ListBox, Select, Tabs, TextField } from "@heroui/react";
import { ArrowRotateRight } from "@gravity-ui/icons";

import { ApiError } from "@/types/api";
import { useSessionStore } from "@/state/session-store";
import { useMyWorkspacePermissionsQuery } from "@/features/roles/hooks/useWorkspaceRolesQuery";
import { SettingsSectionShell } from "@/features/settings/components/SettingsSectionShell";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import type { EskizReportPeriod, EskizTemplate } from "@/features/eskiz/types";
import {
  useConnectEskizMutation,
  useDisconnectEskizMutation,
  useEskizAccountQuery,
  useEskizGuidanceQuery,
  useEskizHistoryQuery,
  useEskizReportsQuery,
  useEskizTemplatesQuery,
  useEskizTopUpMutation,
  useResubmitEskizTemplateMutation,
  useSubmitEskizTemplateMutation,
  useSyncEskizBalanceMutation,
  useSyncEskizTemplatesMutation,
} from "@/features/eskiz/hooks/useEskiz";

function actionErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return "Only the workspace owner can manage the Eskiz connection.";
    if (error.isValidationError) return error.message;
    if (error.isServerError) return "Something went wrong on our end. Please try again shortly.";
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

function formatUzs(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${n.toLocaleString("uz-UZ")} so'm`;
}

function statusChip(status: string) {
  const s = status.toLowerCase();
  const color =
    s === "connected" || s === "approved" || s === "delivered"
      ? "success"
      : s === "failed" || s === "rejected" || s === "token_expired" || s === "not_connected" || s === "disconnected"
        ? "danger"
        : "default";
  return (
    <Chip size="sm" color={color} variant="soft">
      <Chip.Label>{status}</Chip.Label>
    </Chip>
  );
}

type TabId = "overview" | "connect" | "topup" | "templates" | "history" | "reports";

function OverviewTab({ workspaceId, onGoConnect }: { workspaceId: string; onGoConnect: () => void }) {
  const accountQuery = useEskizAccountQuery(workspaceId);
  const guidanceQuery = useEskizGuidanceQuery();
  const syncBalance = useSyncEskizBalanceMutation(workspaceId);
  const [error, setError] = useState<string | null>(null);

  if (accountQuery.isLoading) return <LoadingState label="Loading Eskiz account…" className="py-12" />;
  if (accountQuery.isError) {
    return <ErrorState error={accountQuery.error} onRetry={() => accountQuery.refetch()} className="py-12" />;
  }

  const account = accountQuery.data;
  const price = guidanceQuery.data?.sms_price_uzs ?? 50;
  const lowBalanceThreshold = guidanceQuery.data?.low_balance_threshold_uzs ?? 50000;
  const estimatedSms = account?.balance_uzs != null && price > 0 ? Math.floor(account.balance_uzs / price) : null;
  const lowBalance = account?.balance_uzs != null && account.balance_uzs < lowBalanceThreshold;

  async function handleSync() {
    if (syncBalance.isPending) return;
    setError(null);
    try {
      await syncBalance.mutateAsync();
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  }

  if (!account) {
    return (
      <EmptyState
        title="No Eskiz account connected"
        description="Connect your Eskiz SMS gateway account to send SMS from Operatora."
        action={<Button onPress={onGoConnect}>Connect account</Button>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-black/[0.08] p-4 dark:border-white/[0.12]">
        <div>
          <p className="text-sm font-semibold text-foreground">{account.email}</p>
          <p className="mt-0.5 flex items-center gap-2 text-xs text-foreground/60">
            Sender: {account.sender_id} {statusChip(account.connection_status)}
          </p>
        </div>
        <Button size="sm" variant="secondary" isDisabled={syncBalance.isPending} onPress={handleSync}>
          <ArrowRotateRight className="size-3.5" aria-hidden="true" />
          {syncBalance.isPending ? "Refreshing…" : "Refresh balance"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-black/[0.08] p-4 dark:border-white/[0.12]">
          <p className="text-xs text-foreground/50">Balance</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{formatUzs(account.balance_uzs)}</p>
        </div>
        <div className="rounded-xl border border-black/[0.08] p-4 dark:border-white/[0.12]">
          <p className="text-xs text-foreground/50">SMS price</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{formatUzs(price)}</p>
        </div>
        <div className="rounded-xl border border-black/[0.08] p-4 dark:border-white/[0.12]">
          <p className="text-xs text-foreground/50">Estimated SMS remaining</p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {estimatedSms != null ? estimatedSms.toLocaleString() : "—"}
          </p>
        </div>
      </div>

      {lowBalance ? (
        <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
          Balance is low — top up to avoid interrupted SMS sending.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ConnectTab({ workspaceId, canManage }: { workspaceId: string; canManage: boolean }) {
  const accountQuery = useEskizAccountQuery(workspaceId);
  const connect = useConnectEskizMutation(workspaceId);
  const disconnect = useDisconnectEskizMutation(workspaceId);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [senderId, setSenderId] = useState("4546");
  const [error, setError] = useState<string | null>(null);

  const account = accountQuery.data;
  const busy = connect.isPending || disconnect.isPending;

  async function handleConnect() {
    if (connect.isPending) return; // guard double-submit
    setError(null);
    try {
      await connect.mutateAsync({ email: email.trim(), password, sender_id: senderId.trim() || undefined });
      setPassword("");
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  }

  async function handleDisconnect() {
    if (disconnect.isPending) return;
    setError(null);
    try {
      await disconnect.mutateAsync();
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {!canManage ? (
        <p className="text-sm text-foreground/60">Only the workspace owner can connect or disconnect Eskiz.</p>
      ) : null}

      {account ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-black/[0.08] bg-black/[0.02] p-4 dark:border-white/[0.12] dark:bg-white/[0.03]">
          <div>
            <p className="text-sm font-medium text-foreground">{account.email}</p>
            <p className="mt-0.5 text-xs text-foreground/60">
              Sender: {account.sender_id} · {statusChip(account.connection_status)}
            </p>
          </div>
          {canManage ? (
            <Button size="sm" variant="danger-soft" isDisabled={busy} onPress={handleDisconnect}>
              {disconnect.isPending ? "Disconnecting…" : "Disconnect"}
            </Button>
          ) : null}
        </div>
      ) : null}

      <TextField value={email} onChange={setEmail} isDisabled={!canManage}>
        <Label>Eskiz login (email)</Label>
        <Input type="email" placeholder="sms-gateway@company.uz" autoComplete="off" />
      </TextField>
      <TextField value={password} onChange={setPassword} isDisabled={!canManage}>
        <Label>Eskiz password</Label>
        <Input type="password" autoComplete="new-password" />
      </TextField>
      <TextField value={senderId} onChange={setSenderId} isDisabled={!canManage}>
        <Label>Sender ID</Label>
        <Input placeholder="4546" />
      </TextField>

      <div>
        <Button
          isDisabled={!canManage || connect.isPending || !email.trim() || !password}
          onPress={handleConnect}
        >
          {connect.isPending ? "Connecting…" : account ? "Update connection" : "Connect account"}
        </Button>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Kill-switch mirroring the old frontend's `PAYME_PAYMENTS_ENABLED` and
 * this app's own `RentSeatModal.tsx` precedent — off by default, flip with
 * `NEXT_PUBLIC_PAYME_PAYMENTS_ENABLED=1`. */
const PAYME_PAYMENTS_ENABLED = process.env.NEXT_PUBLIC_PAYME_PAYMENTS_ENABLED === "1";

function TopUpTab({ canManage }: { canManage: boolean }) {
  const [amount, setAmount] = useState("50000");
  const [provider, setProvider] = useState<"payme" | "click" | "paylov">(
    PAYME_PAYMENTS_ENABLED ? "payme" : "click",
  );
  const topUp = useEskizTopUpMutation();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function handleSubmit() {
    if (topUp.isPending) return;
    setError(null);
    setResult(null);
    const amountUzs = Number.parseInt(amount.replace(/\D/g, ""), 10);
    if (!amountUzs || amountUzs < 1000) {
      setError("Enter an amount of at least 1,000 so'm.");
      return;
    }
    try {
      const data = await topUp.mutateAsync({ amountUzs, provider });
      const checkoutUrl = data.paylov_url || data.payment_url || null;
      if (checkoutUrl) {
        const popup = window.open(checkoutUrl, "operatora-eskiz-pay", "popup=yes,width=500,height=720");
        if (!popup) {
          setResult(`Payment link: ${checkoutUrl}`);
        } else {
          setResult(data.message || `Top-up initiated (ref: ${data.transactionId ?? "n/a"}).`);
        }
      } else {
        setResult(data.message || `Top-up initiated (ref: ${data.transactionId ?? "n/a"}).`);
      }
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  }

  return (
    <div className="flex max-w-sm flex-col gap-4">
      <p className="text-sm text-foreground/60">
        Add funds to your connected Eskiz account&apos;s SMS balance.
      </p>
      {!canManage ? (
        <p className="text-sm text-foreground/60">Only the workspace owner can top up the balance.</p>
      ) : null}
      <TextField value={amount} onChange={setAmount} isDisabled={!canManage}>
        <Label>Amount (so&apos;m)</Label>
        <Input inputMode="numeric" placeholder="50000" />
      </TextField>
      <div className="flex gap-2">
        {PAYME_PAYMENTS_ENABLED ? (
          <Button
            size="sm"
            variant={provider === "payme" ? "primary" : "secondary"}
            isDisabled={!canManage}
            onPress={() => setProvider("payme")}
          >
            Payme
          </Button>
        ) : null}
        <Button
          size="sm"
          variant={provider === "click" ? "primary" : "secondary"}
          isDisabled={!canManage}
          onPress={() => setProvider("click")}
        >
          Click
        </Button>
        <Button
          size="sm"
          variant={provider === "paylov" ? "primary" : "secondary"}
          isDisabled={!canManage}
          onPress={() => setProvider("paylov")}
        >
          Paylov
        </Button>
      </div>
      <div>
        <Button isDisabled={!canManage || topUp.isPending} onPress={handleSubmit}>
          {topUp.isPending ? "Starting…" : "Top up balance"}
        </Button>
      </div>
      {result ? <p className="text-sm text-success">{result}</p> : null}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function templateStatusLabel(tpl: EskizTemplate): string {
  if (tpl.status === "approved") return "approved";
  if (tpl.status === "rejected") return "rejected";
  if (tpl.status === "moderation") return "moderation";
  return "draft";
}

function TemplatesTab({
  workspaceId,
  hasAccount,
  canManage,
}: {
  workspaceId: string;
  hasAccount: boolean;
  canManage: boolean;
}) {
  const templatesQuery = useEskizTemplatesQuery(workspaceId, hasAccount);
  const submit = useSubmitEskizTemplateMutation(workspaceId);
  const sync = useSyncEskizTemplatesMutation(workspaceId);
  const resubmit = useResubmitEskizTemplateMutation(workspaceId);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!hasAccount) {
    return <EmptyState title="Connect Eskiz first" description="Templates require a connected Eskiz account." />;
  }

  async function handleSubmit() {
    if (submit.isPending || !content.trim()) return;
    setError(null);
    try {
      await submit.mutateAsync(content.trim());
      setContent("");
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  }

  async function handleResubmit(id: string) {
    if (resubmit.isPending) return;
    setError(null);
    try {
      await resubmit.mutateAsync(id);
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  }

  if (templatesQuery.isLoading) return <LoadingState label="Loading templates…" className="py-12" />;
  if (templatesQuery.isError) {
    return <ErrorState error={templatesQuery.error} onRetry={() => templatesQuery.refetch()} className="py-12" />;
  }
  const templates = templatesQuery.data ?? [];

  return (
    <div className="flex flex-col gap-5">
      {canManage ? (
        <div className="rounded-xl border border-black/[0.08] p-4 dark:border-white/[0.12]">
          <p className="text-sm font-semibold text-foreground">Submit a new template</p>
          <textarea
            className="mt-3 min-h-[100px] w-full rounded-lg border border-black/[0.1] bg-transparent px-3 py-2 text-sm dark:border-white/[0.15]"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Hurmatli mijoz, buyurtmangiz qabul qilindi. Rahmat!"
          />
          <div className="mt-3">
            <Button size="sm" isDisabled={!content.trim() || submit.isPending} onPress={handleSubmit}>
              {submit.isPending ? "Submitting…" : "Submit for approval"}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Templates</p>
        <Button
          size="sm"
          variant="secondary"
          isDisabled={sync.isPending}
          onPress={() => void sync.mutateAsync()}
        >
          <ArrowRotateRight className="size-3.5" aria-hidden="true" />
          {sync.isPending ? "Syncing…" : "Sync from Eskiz"}
        </Button>
      </div>

      {templates.length === 0 ? (
        <EmptyState title="No templates yet" description="Submit a template above to get started." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-black/[0.08] dark:border-white/[0.12]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/[0.08] bg-black/[0.02] text-left text-xs font-medium text-foreground/50 dark:border-white/[0.12] dark:bg-white/[0.03]">
                <th className="px-4 py-2 font-medium">Template</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Updated</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {templates.map((tpl) => (
                <tr key={tpl.id} className="border-b border-black/[0.06] last:border-b-0 dark:border-white/[0.08]">
                  <td className="max-w-md truncate px-4 py-2.5">{tpl.content}</td>
                  <td className="px-4 py-2.5">{statusChip(templateStatusLabel(tpl))}</td>
                  <td className="px-4 py-2.5 text-foreground/60">
                    {new Date(tpl.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {tpl.status === "rejected" && canManage ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        isDisabled={resubmit.isPending}
                        onPress={() => handleResubmit(tpl.id)}
                      >
                        {resubmit.isPending ? "Resubmitting…" : "Resubmit"}
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const HISTORY_STATUS_OPTIONS = [
  { id: "all", label: "All statuses" },
  { id: "delivered", label: "Delivered" },
  { id: "sent", label: "Sent" },
  { id: "failed", label: "Failed" },
  { id: "pending", label: "Pending" },
];

function HistoryTab({ workspaceId, hasAccount }: { workspaceId: string; hasAccount: boolean }) {
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const historyQuery = useEskizHistoryQuery(
    workspaceId,
    { status: status === "all" ? undefined : status, period: "all", page },
    hasAccount,
  );

  if (!hasAccount) {
    return <EmptyState title="Connect Eskiz first" description="SMS history requires a connected Eskiz account." />;
  }
  if (historyQuery.isLoading) return <LoadingState label="Loading SMS history…" className="py-12" />;
  if (historyQuery.isError) {
    return <ErrorState error={historyQuery.error} onRetry={() => historyQuery.refetch()} className="py-12" />;
  }

  const data = historyQuery.data ?? { items: [], total: 0, page: 1, limit: 50 };

  return (
    <div className="flex flex-col gap-4">
      <label className="flex w-48 flex-col gap-1 text-xs text-foreground/50">
        Status
        <Select
          aria-label="Status"
          value={status}
          onChange={(key) => {
            if (typeof key === "string") {
              setStatus(key);
              setPage(1);
            }
          }}
          variant="secondary"
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox items={HISTORY_STATUS_OPTIONS}>
              {(opt) => (
                <ListBox.Item id={opt.id} textValue={opt.label}>
                  {opt.label}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              )}
            </ListBox>
          </Select.Popover>
        </Select>
      </label>

      {data.items.length === 0 ? (
        <EmptyState title="No SMS sent yet" description="Sent messages will show up here." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-black/[0.08] dark:border-white/[0.12]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/[0.08] bg-black/[0.02] text-left text-xs font-medium text-foreground/50 dark:border-white/[0.12] dark:bg-white/[0.03]">
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Phone</th>
                <th className="px-4 py-2 font-medium">Message</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((row) => (
                <tr key={row.id} className="border-b border-black/[0.06] last:border-b-0 dark:border-white/[0.08]">
                  <td className="whitespace-nowrap px-4 py-2.5 text-foreground/60">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs">{row.phone_number ?? "—"}</td>
                  <td className="max-w-xs truncate px-4 py-2.5">{row.text}</td>
                  <td className="px-4 py-2.5">
                    {statusChip(row.status)}
                    {row.error_message ? (
                      <p className="mt-1 max-w-[220px] truncate text-xs text-danger">{row.error_message}</p>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.total > data.limit ? (
        <div className="flex items-center justify-between">
          <span className="text-xs text-foreground/50">
            Page {data.page} · {data.total} total
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" isDisabled={data.page <= 1} onPress={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button
              size="sm"
              variant="secondary"
              isDisabled={data.page * data.limit >= data.total}
              onPress={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const REPORT_PERIOD_OPTIONS: Array<{ id: EskizReportPeriod; label: string }> = [
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "all", label: "All time" },
];

function ReportsTab({ workspaceId, hasAccount }: { workspaceId: string; hasAccount: boolean }) {
  const [period, setPeriod] = useState<EskizReportPeriod>("today");
  const reportsQuery = useEskizReportsQuery(workspaceId, period, hasAccount);

  if (!hasAccount) {
    return <EmptyState title="Connect Eskiz first" description="Reports require a connected Eskiz account." />;
  }
  if (reportsQuery.isLoading) return <LoadingState label="Loading reports…" className="py-12" />;
  if (reportsQuery.isError) {
    return <ErrorState error={reportsQuery.error} onRetry={() => reportsQuery.refetch()} className="py-12" />;
  }

  const reports = reportsQuery.data;

  return (
    <div className="flex flex-col gap-4">
      <label className="flex w-48 flex-col gap-1 text-xs text-foreground/50">
        Period
        <Select
          aria-label="Period"
          value={period}
          onChange={(key) => typeof key === "string" && setPeriod(key as EskizReportPeriod)}
          variant="secondary"
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox items={REPORT_PERIOD_OPTIONS}>
              {(opt) => (
                <ListBox.Item id={opt.id} textValue={opt.label}>
                  {opt.label}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              )}
            </ListBox>
          </Select.Popover>
        </Select>
      </label>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total messages", value: reports?.total_messages ?? 0 },
          { label: "Delivered", value: reports?.delivered ?? 0 },
          { label: "Failed", value: reports?.failed ?? 0 },
          { label: "Delivery rate", value: `${reports?.delivery_rate ?? 0}%` },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-black/[0.08] p-4 dark:border-white/[0.12]">
            <p className="text-xs text-foreground/50">{card.label}</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{card.value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-black/[0.08] p-4 dark:border-white/[0.12]">
        <p className="text-xs text-foreground/50">Estimated cost</p>
        <p className="mt-1 text-lg font-semibold text-foreground">{formatUzs(reports?.estimated_cost_uzs ?? 0)}</p>
      </div>
    </div>
  );
}

/**
 * Eskiz SMS — see `features/eskiz/types.ts` for the full contract trace.
 * `create`/`disconnect` are workspace-owner-gated server-side
 * (`assertWorkspaceOwner`); reproduced client-side the same way Telegram's
 * settings panel does (`GET /workspace-rbac/me`'s `workspace_role`).
 */
export function EskizSettingsPanel() {
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const accountQuery = useEskizAccountQuery(workspaceId);
  const permissionsQuery = useMyWorkspacePermissionsQuery(workspaceId);
  const [tab, setTab] = useState<TabId>("overview");

  const shellProps = {
    title: "Eskiz SMS",
    subtitle: "Connect your Eskiz account, manage templates, view SMS history and reports.",
  } as const;

  if (!workspaceId) {
    return (
      <SettingsSectionShell {...shellProps}>
        <EmptyState title="No workspace selected" description="Select a workspace to manage Eskiz." />
      </SettingsSectionShell>
    );
  }

  const canManage =
    permissionsQuery.data?.workspace_role === "workspace_owner" ||
    permissionsQuery.data?.workspace_role === "owner";
  const hasAccount = !!accountQuery.data;

  return (
    <SettingsSectionShell {...shellProps} wide>
      <Tabs selectedKey={tab} onSelectionChange={(key) => setTab(key as TabId)}>
        <Tabs.List>
          <Tabs.Tab id="overview">Overview</Tabs.Tab>
          <Tabs.Tab id="connect">Connect</Tabs.Tab>
          <Tabs.Tab id="topup">Top up</Tabs.Tab>
          <Tabs.Tab id="templates">Templates</Tabs.Tab>
          <Tabs.Tab id="history">History</Tabs.Tab>
          <Tabs.Tab id="reports">Reports</Tabs.Tab>
        </Tabs.List>

        <div className="pt-5">
          <Tabs.Panel id="overview">
            <OverviewTab workspaceId={workspaceId} onGoConnect={() => setTab("connect")} />
          </Tabs.Panel>
          <Tabs.Panel id="connect">
            <ConnectTab workspaceId={workspaceId} canManage={canManage} />
          </Tabs.Panel>
          <Tabs.Panel id="topup">
            <TopUpTab canManage={canManage} />
          </Tabs.Panel>
          <Tabs.Panel id="templates">
            <TemplatesTab workspaceId={workspaceId} hasAccount={hasAccount} canManage={canManage} />
          </Tabs.Panel>
          <Tabs.Panel id="history">
            <HistoryTab workspaceId={workspaceId} hasAccount={hasAccount} />
          </Tabs.Panel>
          <Tabs.Panel id="reports">
            <ReportsTab workspaceId={workspaceId} hasAccount={hasAccount} />
          </Tabs.Panel>
        </div>
      </Tabs>
    </SettingsSectionShell>
  );
}
