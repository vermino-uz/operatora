"use client";

import { useState } from "react";
import { Button, Chip, Input, Label, ListBox, Select, Switch, TextField } from "@heroui/react";
import { FolderKeyhole, TrashBin, Xmark } from "@gravity-ui/icons";

import { useSessionStore } from "@/state/session-store";
import { ApiError } from "@/types/api";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { SettingsSectionShell } from "@/features/settings/components/SettingsSectionShell";
import {
  useCancelSuperAgentTaskMutation,
  useCreateSuperAgentCredentialMutation,
  useDeleteSuperAgentCredentialMutation,
  useSetSuperAgentEnabledMutation,
  useSuperAgentCredentialsQuery,
  useSuperAgentSettingsQuery,
  useSuperAgentTaskQuery,
  useSuperAgentTasksQuery,
  useSuperAgentTasksRealtime,
} from "@/features/super-agent/hooks/useSuperAgent";
import {
  ACTIVE_TASK_STATUSES,
  SUPER_AGENT_SERVICE_OPTIONS,
  TASK_STATUS_LABELS,
  type SuperAgentCredential,
  type SuperAgentTask,
  type SuperAgentTaskStatus,
} from "@/features/super-agent/types";

function actionErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return "You don't have permission to do that.";
    if (error.isValidationError) return error.message;
    if (error.isServerError) return "Something went wrong on our end. Please try again shortly.";
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

const STATUS_COLOR: Record<SuperAgentTaskStatus, "warning" | "accent" | "success" | "danger" | "default"> = {
  queued: "warning",
  dispatched: "warning",
  running: "accent",
  waiting_input: "warning",
  succeeded: "success",
  failed: "danger",
  cancelled: "default",
  scheduled: "default",
};

function TaskRow({
  task,
  workspaceId,
  onCancel,
  cancelling,
}: {
  task: SuperAgentTask;
  workspaceId: string;
  onCancel: (id: string) => void;
  cancelling: boolean;
}) {
  const [open, setOpen] = useState(false);
  const active = ACTIVE_TASK_STATUSES.includes(task.status);
  const detail = useSuperAgentTaskQuery(workspaceId, open ? task.id : null, {
    refetchIntervalMs: open && active ? 5000 : undefined,
  });
  const when = new Date(task.created_at).toLocaleString();

  return (
    <div className="border-b border-black/[0.08] last:border-b-0 dark:border-white/[0.12]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.04]"
      >
        <Chip size="sm" color={STATUS_COLOR[task.status]} variant="soft">
          <Chip.Label>{TASK_STATUS_LABELS[task.status]}</Chip.Label>
        </Chip>
        <span className="min-w-0 flex-1 truncate text-sm text-foreground">{task.title}</span>
        <span className="shrink-0 text-xs text-foreground/50">{when}</span>
        {active ? (
          <Button
            size="sm"
            variant="secondary"
            isDisabled={cancelling}
            onPress={(e) => {
              (e as unknown as { stopPropagation?: () => void }).stopPropagation?.();
              onCancel(task.id);
            }}
          >
            <Xmark className="size-3.5" aria-hidden="true" />
            Cancel
          </Button>
        ) : null}
      </button>
      {open ? (
        <div className="space-y-3 px-4 pb-4">
          {task.result_summary ? (
            <p className="rounded-lg bg-black/[0.03] p-3 text-sm whitespace-pre-wrap text-foreground dark:bg-white/[0.04]">
              {task.result_summary}
            </p>
          ) : null}
          {task.error ? <p className="text-sm whitespace-pre-wrap text-danger">{task.error}</p> : null}
          {detail.isLoading ? (
            <p className="text-xs text-foreground/50">Loading events…</p>
          ) : detail.isError ? (
            <p className="text-xs text-danger">Couldn&apos;t load the event log.</p>
          ) : (
            <ul className="space-y-1">
              {(detail.data?.events ?? []).map((ev) => (
                <li key={ev.id} className="flex gap-2 text-xs text-foreground/60">
                  <span className="shrink-0 text-foreground/40">{new Date(ev.ts).toLocaleTimeString()}</span>
                  <span className="min-w-0 break-words">{ev.message ?? ev.kind}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Super Agent (Hermes) — see `features/super-agent/types.ts` for the
 * confirmed `/super-agent/*` contract. Corporate-plan-and-Founder-only
 * feature; the backend re-enforces this on every mutating call regardless
 * of what this panel shows.
 */
export function SuperAgentPanel() {
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const settingsQuery = useSuperAgentSettingsQuery(workspaceId);
  const toggleEnabled = useSetSuperAgentEnabledMutation(workspaceId);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const enabled = settingsQuery.data?.settings.enabled ?? false;
  const credsQuery = useSuperAgentCredentialsQuery(workspaceId, enabled && !!settingsQuery.data);
  const tasksQuery = useSuperAgentTasksQuery(workspaceId, enabled);
  useSuperAgentTasksRealtime(workspaceId, enabled);

  const createCredential = useCreateSuperAgentCredentialMutation(workspaceId);
  const deleteCredential = useDeleteSuperAgentCredentialMutation(workspaceId);
  const cancelTask = useCancelSuperAgentTaskMutation(workspaceId);

  const [form, setForm] = useState({
    service: "bitrix",
    label: "",
    login_url: "",
    username: "",
    password: "",
    totp: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SuperAgentCredential | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const shellProps = {
    title: "Super Agent (Hermes)",
    subtitle: "A full-browser autonomous agent that pulls data from Bitrix, ad accounts, and other external services.",
  } as const;

  if (!workspaceId) {
    return (
      <SettingsSectionShell {...shellProps}>
        <ErrorState error={new Error("No workspace selected")} />
      </SettingsSectionShell>
    );
  }

  if (settingsQuery.isLoading) {
    return (
      <SettingsSectionShell {...shellProps}>
        <LoadingState label="Loading Super Agent status…" className="py-16" />
      </SettingsSectionShell>
    );
  }

  if (settingsQuery.isError) {
    return (
      <SettingsSectionShell {...shellProps}>
        <ErrorState error={settingsQuery.error} onRetry={() => settingsQuery.refetch()} className="py-16" />
      </SettingsSectionShell>
    );
  }

  const settings = settingsQuery.data;
  if (!settings) {
    return (
      <SettingsSectionShell {...shellProps}>
        <LoadingState label="Loading Super Agent status…" className="py-16" />
      </SettingsSectionShell>
    );
  }
  const runnerOnline = settings.runner.online;
  const planOk = settings.access.plan_ok;
  const ownerOk = settings.access.owner_ok;
  const credsForbidden = credsQuery.isError;

  if (!planOk || !ownerOk) {
    return (
      <SettingsSectionShell {...shellProps}>
        <div className="rounded-xl border border-black/[0.08] bg-black/[0.02] p-5 text-sm text-foreground/70 dark:border-white/[0.12] dark:bg-white/[0.04]">
          {!planOk
            ? "Super Agent is available on the Corporate plan. Upgrade your workspace to enable it."
            : "Only the workspace Founder (owner) can enable and configure Super Agent."}
        </div>
      </SettingsSectionShell>
    );
  }

  async function handleToggle(next: boolean) {
    if (toggleEnabled.isPending) return; // guard double-submit
    setToggleError(null);
    try {
      await toggleEnabled.mutateAsync(next);
    } catch (err) {
      setToggleError(actionErrorMessage(err));
    }
  }

  async function handleCreateCredential() {
    if (createCredential.isPending) return;
    setFormError(null);
    if (!form.username.trim() || !form.password) {
      setFormError("Username and password are required.");
      return;
    }
    try {
      await createCredential.mutateAsync({
        service: form.service,
        label:
          form.label.trim() ||
          SUPER_AGENT_SERVICE_OPTIONS.find((s) => s.value === form.service)?.label ||
          form.service,
        login_url: form.login_url.trim() || undefined,
        username: form.username.trim(),
        password: form.password,
        extra: form.totp.trim() ? { totp_secret: form.totp.trim() } : undefined,
      });
      setForm({ service: "bitrix", label: "", login_url: "", username: "", password: "", totp: "" });
    } catch (err) {
      setFormError(actionErrorMessage(err));
    }
  }

  async function handleDeleteCredential() {
    if (!deleteTarget || deleteCredential.isPending) return;
    setDeleteError(null);
    try {
      await deleteCredential.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(actionErrorMessage(err));
    }
  }

  return (
    <SettingsSectionShell {...shellProps} wide>
      <div className="flex max-w-[840px] flex-col gap-6">
        <div className="rounded-xl border border-black/[0.08] p-5 dark:border-white/[0.12]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">Runner status</p>
            <Chip size="sm" color={runnerOnline ? "success" : "default"} variant="soft">
              <Chip.Label>{runnerOnline ? "Online" : "Offline"}</Chip.Label>
            </Chip>
          </div>
          <label className="flex items-center justify-between gap-4 rounded-xl border border-black/[0.08] px-4 py-3.5 dark:border-white/[0.12]">
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">Enable Super Agent</span>
              <span className="block text-sm text-foreground/60">
                Allow the agent to sign into connected services and run tasks for this workspace.
              </span>
            </span>
            <Switch
              isSelected={enabled}
              onChange={(v) => void handleToggle(v)}
              isDisabled={toggleEnabled.isPending}
              aria-label="Enable Super Agent"
            >
              <Switch.Content>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch.Content>
            </Switch>
          </label>
          {toggleError ? (
            <p role="alert" className="mt-3 text-sm text-danger">
              {toggleError}
            </p>
          ) : null}
          {enabled && !runnerOnline ? (
            <p className="mt-3 text-sm text-warning-700 dark:text-warning-300">
              The Super Agent runner is currently offline — tasks will queue until it&apos;s back.
            </p>
          ) : null}
        </div>

        {enabled && !credsForbidden ? (
          <div>
            <p className="mb-3 text-sm font-semibold text-foreground">Saved logins</p>
            {(credsQuery.data ?? []).length > 0 ? (
              <div className="mb-4 overflow-hidden rounded-xl border border-black/[0.08] dark:border-white/[0.12]">
                {(credsQuery.data ?? []).map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 border-b border-black/[0.08] px-4 py-3 last:border-b-0 dark:border-white/[0.12]"
                  >
                    <FolderKeyhole className="size-4 shrink-0 text-foreground/40" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-foreground">
                        {c.label} <span className="text-foreground/40">· {c.service}</span>
                      </p>
                      <p className="truncate text-xs text-foreground/50">
                        {c.username}
                        {c.login_url ? ` · ${c.login_url}` : ""}
                      </p>
                    </div>
                    <Button size="sm" variant="secondary" onPress={() => setDeleteTarget(c)} aria-label="Delete">
                      <TrashBin className="size-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="rounded-xl border border-black/[0.08] p-5 dark:border-white/[0.12]">
              <p className="mb-4 text-sm font-semibold text-foreground">Add a login</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  aria-label="Service"
                  value={form.service}
                  onChange={(key) => {
                    if (typeof key === "string") setForm((f) => ({ ...f, service: key }));
                  }}
                >
                  <Label>Service</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox items={SUPER_AGENT_SERVICE_OPTIONS.map((s) => ({ id: s.value, label: s.label }))}>
                      {(opt) => (
                        <ListBox.Item id={opt.id} textValue={opt.label}>
                          {opt.label}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      )}
                    </ListBox>
                  </Select.Popover>
                </Select>
                <TextField>
                  <Label>Label</Label>
                  <Input
                    value={form.label}
                    onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                    placeholder="Main Bitrix account"
                  />
                </TextField>
                <TextField>
                  <Label>Login URL</Label>
                  <Input
                    value={form.login_url}
                    onChange={(e) => setForm((f) => ({ ...f, login_url: e.target.value }))}
                    placeholder="https://mycompany.bitrix24.com"
                  />
                </TextField>
                <TextField isRequired>
                  <Label>Username</Label>
                  <Input
                    value={form.username}
                    onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                    autoComplete="off"
                  />
                </TextField>
                <TextField isRequired>
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    autoComplete="new-password"
                  />
                </TextField>
                <TextField>
                  <Label>TOTP secret (optional)</Label>
                  <Input
                    value={form.totp}
                    onChange={(e) => setForm((f) => ({ ...f, totp: e.target.value }))}
                    autoComplete="off"
                  />
                </TextField>
              </div>
              {formError ? (
                <p role="alert" className="mt-3 text-sm text-danger">
                  {formError}
                </p>
              ) : null}
              <div className="mt-4">
                <Button
                  isDisabled={createCredential.isPending || !form.username.trim() || !form.password}
                  onPress={() => void handleCreateCredential()}
                >
                  {createCredential.isPending ? "Saving…" : "Add login"}
                </Button>
              </div>
            </div>
            <p className="mt-3 text-xs text-foreground/50">
              Credentials are encrypted at rest and never displayed again after saving.
            </p>

            {deleteTarget ? (
              <div className="mt-4 rounded-xl border border-danger/30 bg-danger/5 p-4">
                <p className="text-sm text-foreground">
                  Delete &ldquo;{deleteTarget.label}&rdquo;? This can&apos;t be undone.
                </p>
                {deleteError ? <p className="mt-2 text-sm text-danger">{deleteError}</p> : null}
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="secondary" onPress={() => setDeleteTarget(null)}>
                    Cancel
                  </Button>
                  <Button size="sm" variant="danger" isDisabled={deleteCredential.isPending} onPress={() => void handleDeleteCredential()}>
                    {deleteCredential.isPending ? "Deleting…" : "Delete"}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {enabled ? (
          <div>
            <p className="mb-3 text-sm font-semibold text-foreground">Tasks</p>
            {tasksQuery.isLoading ? (
              <LoadingState label="Loading tasks…" className="py-10" />
            ) : tasksQuery.isError ? (
              <ErrorState error={tasksQuery.error} onRetry={() => tasksQuery.refetch()} className="py-10" />
            ) : (tasksQuery.data ?? []).length === 0 ? (
              <EmptyState title="No tasks yet" description="Super Agent tasks created from chat will show up here." />
            ) : (
              <div className="overflow-hidden rounded-xl border border-black/[0.08] dark:border-white/[0.12]">
                {(tasksQuery.data ?? []).map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    workspaceId={workspaceId}
                    onCancel={(id) => cancelTask.mutate(id)}
                    cancelling={cancelTask.isPending}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-foreground/50">Enable Super Agent above to manage logins and tasks.</p>
        )}
      </div>
    </SettingsSectionShell>
  );
}
