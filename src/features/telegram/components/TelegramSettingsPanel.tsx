"use client";

import { useState } from "react";
import { Button, Chip, Input, Label, Modal, TextField, useOverlayState } from "@heroui/react";
import { Check, ChevronDown, ChevronUp, Copy, Eye, EyeSlash, PaperPlane, TrashBin } from "@gravity-ui/icons";

import { ApiError } from "@/types/api";
import { useSessionStore } from "@/state/session-store";
import { useMyWorkspacePermissionsQuery } from "@/features/roles/hooks/useWorkspaceRolesQuery";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { SettingsSectionShell } from "@/features/settings/components/SettingsSectionShell";
import type { TelegramIntegration } from "@/features/telegram/types";
import {
  useCreateTelegramIntegrationMutation,
  useRemoveTelegramIntegrationMutation,
  useRemoveTelegramWebhookMutation,
  useSetTelegramWebhookMutation,
  useTelegramIntegrationsQuery,
  useTelegramWebhookInfoMutation,
  useTestTelegramBotMutation,
  useUpdateTelegramBotTokenMutation,
} from "@/features/telegram/hooks/useTelegramIntegrations";

function actionErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return "Only the workspace owner can manage Telegram bot integrations.";
    if (error.isValidationError) return error.message;
    if (error.isServerError) return "Something went wrong on our end. Please try again shortly.";
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

function maskToken(token: string): string {
  if (!token) return "";
  return token.length > 10 ? `${token.slice(0, 10)}…` : token;
}

function healthChip(integration: TelegramIntegration) {
  if (integration.last_health_status === "connected" && integration.is_active) {
    return (
      <Chip size="sm" color="success" variant="soft">
        <Chip.Label>Connected</Chip.Label>
      </Chip>
    );
  }
  if (integration.last_health_status === "error") {
    return (
      <Chip size="sm" color="danger" variant="soft">
        <Chip.Label>Error</Chip.Label>
      </Chip>
    );
  }
  return (
    <Chip size="sm" color={integration.is_active ? "success" : "default"} variant="soft">
      <Chip.Label>{integration.is_active ? "Active" : "Not connected"}</Chip.Label>
    </Chip>
  );
}

function AddBotCard({ canManage, workspaceId }: { canManage: boolean; workspaceId: string }) {
  const create = useCreateTelegramIntegrationMutation(workspaceId);
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleCreate() {
    if (create.isPending) return; // guard double-submit
    const trimmed = token.trim();
    if (!trimmed) return;
    setError(null);
    setSuccess(false);
    try {
      await create.mutateAsync(trimmed);
      setToken("");
      setSuccess(true);
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  }

  return (
    <section className="rounded-xl border border-black/[0.08] p-5 dark:border-white/[0.12]">
      <h2 className="text-sm font-semibold text-foreground">Add a bot</h2>
      <p className="mt-0.5 text-sm text-foreground/60">
        Create a bot with{" "}
        <a
          href="https://t.me/BotFather"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          @BotFather
        </a>{" "}
        on Telegram, then paste its token here. A workspace may have several bots.
      </p>
      <div className="mt-4 flex items-end gap-2">
        <TextField value={token} onChange={setToken} isDisabled={!canManage} className="max-w-sm flex-1">
          <Label>Bot token</Label>
          <Input
            type="password"
            autoComplete="off"
            placeholder="123456789:AA…"
            onKeyDown={(e) => e.key === "Enter" && void handleCreate()}
          />
        </TextField>
        <Button onPress={handleCreate} isDisabled={!canManage || create.isPending || !token.trim()}>
          {create.isPending ? "Adding…" : "Add bot"}
        </Button>
      </div>
      {!canManage ? (
        <p className="mt-2 text-xs text-foreground/50">Only the workspace owner can add or remove bots.</p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      {success ? <p className="mt-2 text-sm text-success">Bot added.</p> : null}
    </section>
  );
}

function BotCard({
  integration,
  canManage,
  workspaceId,
}: {
  integration: TelegramIntegration;
  canManage: boolean;
  workspaceId: string;
}) {
  const update = useUpdateTelegramBotTokenMutation(workspaceId);
  const remove = useRemoveTelegramIntegrationMutation(workspaceId);
  const test = useTestTelegramBotMutation(workspaceId);
  const setWebhook = useSetTelegramWebhookMutation(workspaceId);
  const removeWebhook = useRemoveTelegramWebhookMutation(workspaceId);
  const webhookInfo = useTelegramWebhookInfoMutation();

  const removeDialog = useOverlayState();
  const [editing, setEditing] = useState(false);
  const [tokenDraft, setTokenDraft] = useState(integration.bot_token);
  const [showToken, setShowToken] = useState(false);
  const [showWebhookInfo, setShowWebhookInfo] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busy = test.isPending || setWebhook.isPending || removeWebhook.isPending || update.isPending;

  async function handleTest() {
    if (test.isPending) return;
    setError(null);
    try {
      await test.mutateAsync(integration.id);
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  }

  async function handleSetWebhook() {
    if (setWebhook.isPending) return;
    setError(null);
    try {
      await setWebhook.mutateAsync(integration.id);
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  }

  async function handleRemoveWebhook() {
    if (removeWebhook.isPending) return;
    setError(null);
    try {
      await removeWebhook.mutateAsync(integration.id);
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  }

  async function handleCheckStatus() {
    if (webhookInfo.isPending) return;
    setError(null);
    try {
      await webhookInfo.mutateAsync(integration.id);
      setShowWebhookInfo(true);
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  }

  async function handleSaveToken() {
    if (update.isPending) return;
    const trimmed = tokenDraft.trim();
    if (!trimmed || trimmed === integration.bot_token) {
      setEditing(false);
      return;
    }
    setError(null);
    try {
      await update.mutateAsync({ id: integration.id, botToken: trimmed });
      setEditing(false);
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  }

  async function handleCopyWebhook() {
    if (!integration.webhook_url) return;
    await navigator.clipboard.writeText(integration.webhook_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-black/[0.08] dark:border-white/[0.12]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.08] px-4 py-3 dark:border-white/[0.12]">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#26A5E4]/10 text-[#26A5E4]">
            <PaperPlane className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {integration.bot_username ? `@${integration.bot_username}` : "Unnamed bot"}
            </p>
            <p className="truncate text-xs text-foreground/50">ID {integration.id.slice(0, 8)}…</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {healthChip(integration)}
          <Button
            size="sm"
            variant="danger-soft"
            isIconOnly
            aria-label="Delete bot"
            isDisabled={!canManage}
            onPress={() => removeDialog.open()}
          >
            <TrashBin className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4">
        {integration.last_error ? (
          <p className="text-sm text-danger">{integration.last_error}</p>
        ) : null}

        <div>
          <p className="text-xs font-medium text-foreground/50">Bot token</p>
          {editing ? (
            <div className="mt-1 flex items-end gap-2">
              <TextField value={tokenDraft} onChange={setTokenDraft} className="max-w-sm flex-1">
                <Input type={showToken ? "text" : "password"} autoComplete="off" className="font-mono" />
              </TextField>
              <Button size="sm" variant="secondary" isIconOnly aria-label="Toggle token visibility" onPress={() => setShowToken((v) => !v)}>
                {showToken ? <EyeSlash className="size-3.5" aria-hidden="true" /> : <Eye className="size-3.5" aria-hidden="true" />}
              </Button>
              <Button size="sm" variant="primary" isDisabled={update.isPending || !tokenDraft.trim()} onPress={handleSaveToken}>
                {update.isPending ? "Saving…" : "Save"}
              </Button>
              <Button size="sm" variant="secondary" onPress={() => { setEditing(false); setTokenDraft(integration.bot_token); }}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="mt-1 flex items-center gap-2">
              <span className="font-mono text-sm text-foreground/80">{maskToken(integration.bot_token)}</span>
              {canManage ? (
                <button
                  type="button"
                  className="text-xs font-medium text-primary underline underline-offset-2"
                  onClick={() => {
                    setTokenDraft(integration.bot_token);
                    setEditing(true);
                  }}
                >
                  Edit
                </button>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" isDisabled={!canManage || busy} onPress={handleTest}>
            {test.isPending ? "Testing…" : "Test connection"}
          </Button>
          {integration.webhook_url ? (
            <Button size="sm" variant="danger-soft" isDisabled={!canManage || busy} onPress={handleRemoveWebhook}>
              {removeWebhook.isPending ? "Removing…" : "Remove webhook"}
            </Button>
          ) : (
            <Button size="sm" variant="secondary" isDisabled={!canManage || busy} onPress={handleSetWebhook}>
              {setWebhook.isPending ? "Setting…" : "Set webhook"}
            </Button>
          )}
          <Button size="sm" variant="secondary" isDisabled={webhookInfo.isPending} onPress={handleCheckStatus}>
            {webhookInfo.isPending ? "Checking…" : "Check webhook status"}
            {showWebhookInfo ? <ChevronUp className="size-3.5" aria-hidden="true" /> : <ChevronDown className="size-3.5" aria-hidden="true" />}
          </Button>
        </div>

        {integration.webhook_url ? (
          <div className="flex items-center gap-2 rounded-lg bg-black/[0.03] px-3 py-2 dark:bg-white/[0.05]">
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground/70">
              {integration.webhook_url}
            </span>
            <Button size="sm" variant="secondary" isIconOnly aria-label="Copy webhook URL" onPress={handleCopyWebhook}>
              {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
            </Button>
          </div>
        ) : null}

        {showWebhookInfo && webhookInfo.data ? (
          <div className="rounded-lg border border-black/[0.06] bg-black/[0.02] p-3 text-xs text-foreground/70 dark:border-white/[0.1] dark:bg-white/[0.03]">
            <p>
              <span className="font-medium text-foreground">URL:</span>{" "}
              {webhookInfo.data.webhook_info.url || "Not set"}
            </p>
            <p>
              <span className="font-medium text-foreground">Pending updates:</span>{" "}
              {webhookInfo.data.webhook_info.pending_update_count ?? 0}
            </p>
            {webhookInfo.data.webhook_info.last_error_message ? (
              <p className="text-danger">
                <span className="font-medium">Last error:</span> {webhookInfo.data.webhook_info.last_error_message}
              </p>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
      </div>

      <Modal isOpen={removeDialog.isOpen} onOpenChange={(open) => (open ? removeDialog.setOpen(true) : removeDialog.close())}>
        <Modal.Backdrop>
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Delete Telegram bot</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="text-sm text-foreground/70">
                  This permanently removes the integration and its webhook configuration. This cannot be undone.
                </p>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onPress={() => removeDialog.close()}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  isDisabled={remove.isPending}
                  onPress={() => remove.mutate(integration.id, { onSuccess: () => removeDialog.close() })}
                >
                  {remove.isPending ? "Deleting…" : "Delete"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}

/**
 * Telegram bot integration — traced against
 * `telegram-controller/telegram-integration/telegram-integration.controller.ts`.
 * See `features/telegram/types.ts` for the full contract trace. Create/
 * delete are workspace-owner-gated server-side (`assertWorkspaceOwner`,
 * 403 for anyone else) — reproduced client-side via the same
 * `workspace_role` check the old frontend's `useWorkspaceOwner` used
 * (`GET /workspace-rbac/me`, already fetched for the Roles & Permissions
 * section), so non-owners see disabled controls with an explanation
 * instead of a raw 403 toast.
 */
export function TelegramSettingsPanel() {
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const integrationsQuery = useTelegramIntegrationsQuery(workspaceId);
  const permissionsQuery = useMyWorkspacePermissionsQuery(workspaceId);

  const canManage =
    permissionsQuery.data?.workspace_role === "workspace_owner" ||
    permissionsQuery.data?.workspace_role === "owner";

  const shellProps = {
    title: "Telegram",
    subtitle: "Connect one or more Telegram bots for inbound conversations and notifications.",
  } as const;

  if (!workspaceId) {
    return (
      <SettingsSectionShell {...shellProps}>
        <EmptyState title="No workspace selected" description="Select a workspace to manage Telegram bots." />
      </SettingsSectionShell>
    );
  }

  if (integrationsQuery.isLoading) {
    return (
      <SettingsSectionShell {...shellProps}>
        <LoadingState label="Loading Telegram bots…" className="py-16" />
      </SettingsSectionShell>
    );
  }

  if (integrationsQuery.isError) {
    return (
      <SettingsSectionShell {...shellProps}>
        <ErrorState error={integrationsQuery.error} onRetry={() => integrationsQuery.refetch()} className="py-16" />
      </SettingsSectionShell>
    );
  }

  const integrations = integrationsQuery.data ?? [];

  return (
    <SettingsSectionShell {...shellProps}>
      <div className="flex flex-col gap-5">
        <AddBotCard canManage={canManage} workspaceId={workspaceId} />

        {integrations.length === 0 ? (
          <EmptyState
            title="No bots connected"
            description="Add a bot above to start receiving Telegram messages in Operatora."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {integrations.map((integration) => (
              <BotCard key={integration.id} integration={integration} canManage={canManage} workspaceId={workspaceId} />
            ))}
          </div>
        )}
      </div>
    </SettingsSectionShell>
  );
}
