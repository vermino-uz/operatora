"use client";

import { useState } from "react";
import { Avatar, Button, Chip, Modal, useOverlayState } from "@heroui/react";
import { ArrowRotateRight, Camera, TrashBin } from "@gravity-ui/icons";

import { ApiError } from "@/types/api";
import { useSessionStore } from "@/state/session-store";
import { useMyWorkspacePermissionsQuery } from "@/features/roles/hooks/useWorkspaceRolesQuery";
import { SettingsSectionShell } from "@/features/settings/components/SettingsSectionShell";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { env } from "@/config/env";
import type { InstagramAccount } from "@/features/instagram/types";
import {
  useDisconnectInstagramMutation,
  useInstagramAccountsQuery,
  useResubscribeInstagramMutation,
} from "@/features/instagram/hooks/useInstagramAccounts";
import { useInstagramOAuthFlow } from "@/features/instagram/hooks/useInstagramOAuthFlow";
import { InstagramOAuthSelectDialog } from "@/features/instagram/components/InstagramOAuthSelectDialog";

function actionErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return "Only the workspace owner can manage the Instagram connection.";
    if (error.isValidationError) return error.message;
    if (error.isServerError) return "Something went wrong on our end. Please try again shortly.";
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

function DisconnectConfirm({
  account,
  onClose,
  onConfirm,
  busy,
}: {
  account: InstagramAccount | null;
  onClose: () => void;
  onConfirm: (deleteConversations: boolean) => void;
  busy: boolean;
}) {
  const [deleteConversations, setDeleteConversations] = useState(false);

  return (
    <Modal isOpen={!!account} onOpenChange={(open) => !open && !busy && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="sm">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Disconnect @{account?.username}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-3">
              <p className="text-sm text-foreground/70">
                This stops receiving new Instagram DMs for this account.
              </p>
              <label className="flex items-start gap-2 text-sm text-foreground/70">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={deleteConversations}
                  onChange={(e) => setDeleteConversations(e.target.checked)}
                />
                Also delete this account&apos;s conversations and messages
              </label>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" isDisabled={busy} onPress={onClose}>
                Cancel
              </Button>
              <Button variant="danger" isDisabled={busy} onPress={() => onConfirm(deleteConversations)}>
                {busy ? "Disconnecting…" : "Disconnect"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function AccountRow({
  account,
  canManage,
  workspaceId,
}: {
  account: InstagramAccount;
  canManage: boolean;
  workspaceId: string;
}) {
  const resubscribe = useResubscribeInstagramMutation(workspaceId);
  const disconnect = useDisconnectInstagramMutation(workspaceId);
  const disconnectDialog = useOverlayState();
  const [error, setError] = useState<string | null>(null);

  async function handleResubscribe() {
    if (resubscribe.isPending) return;
    setError(null);
    try {
      await resubscribe.mutateAsync(account.id);
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  }

  async function handleDisconnect(deleteConversations: boolean) {
    if (disconnect.isPending) return;
    setError(null);
    try {
      await disconnect.mutateAsync({ accountId: account.id, deleteConversations });
      disconnectDialog.close();
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-black/[0.08] p-3 dark:border-white/[0.12]">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar size="sm">
          {account.profile_picture_url ? <Avatar.Image src={account.profile_picture_url} /> : null}
          <Avatar.Fallback>{account.username.slice(0, 2).toUpperCase()}</Avatar.Fallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-foreground">@{account.username}</p>
            <Chip size="sm" color={account.is_active ? "success" : "default"} variant="soft">
              <Chip.Label>{account.is_active ? "Active" : "Inactive"}</Chip.Label>
            </Chip>
          </div>
          {account.last_sync_at ? (
            <p className="text-xs text-foreground/50">
              Last sync {new Date(account.last_sync_at).toLocaleString()}
            </p>
          ) : null}
          {error ? <p className="text-xs text-danger">{error}</p> : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          isIconOnly
          aria-label="Retry webhook subscription"
          isDisabled={resubscribe.isPending}
          onPress={handleResubscribe}
        >
          <ArrowRotateRight className="size-3.5" aria-hidden="true" />
        </Button>
        <Button
          size="sm"
          variant="danger-soft"
          isIconOnly
          aria-label="Disconnect"
          isDisabled={!canManage}
          onPress={() => disconnectDialog.open()}
        >
          <TrashBin className="size-3.5" aria-hidden="true" />
        </Button>
      </div>

      <DisconnectConfirm
        account={disconnectDialog.isOpen ? account : null}
        onClose={() => disconnectDialog.close()}
        onConfirm={handleDisconnect}
        busy={disconnect.isPending}
      />
    </div>
  );
}

/**
 * Instagram — see `features/instagram/types.ts` for the full contract
 * trace. `oauth-url`/`oauth-callback`/`oauth-connect`/`DELETE accounts/:id`
 * are workspace-owner-gated server-side (`assertWorkspaceOwner`) —
 * reproduced client-side the same way Telegram/Eskiz do.
 *
 * Requires the backend's `INSTAGRAM_REDIRECT_URI` env var to point at this
 * app's own `/instagram-callback` route on whatever origin it's deployed
 * to (it wins over anything the client sends — see
 * `instagram.service.ts`'s `resolveOAuthRedirectUri()`) and a Meta app
 * registered with that exact redirect URI. That's a deployment/infra
 * detail outside this frontend's control, not something this code can
 * self-configure — flagged here rather than silently assumed.
 */
export function InstagramSettingsPanel() {
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const userId = useSessionStore((s) => s.user?.id ?? null);
  const accountsQuery = useInstagramAccountsQuery(workspaceId);
  const permissionsQuery = useMyWorkspacePermissionsQuery(workspaceId);
  const canManage =
    permissionsQuery.data?.workspace_role === "workspace_owner" ||
    permissionsQuery.data?.workspace_role === "owner";

  const oauth = useInstagramOAuthFlow({
    workspaceId,
    userId,
    onConnected: () => accountsQuery.refetch(),
  });

  const shellProps = {
    title: "Instagram",
    subtitle: "Connect Instagram Business accounts for direct message handling.",
  } as const;

  if (!workspaceId) {
    return (
      <SettingsSectionShell {...shellProps}>
        <EmptyState title="No workspace selected" description="Select a workspace to manage Instagram." />
      </SettingsSectionShell>
    );
  }

  if (accountsQuery.isLoading) {
    return (
      <SettingsSectionShell {...shellProps}>
        <LoadingState label="Loading Instagram accounts…" className="py-16" />
      </SettingsSectionShell>
    );
  }

  if (accountsQuery.isError) {
    return (
      <SettingsSectionShell {...shellProps}>
        <ErrorState error={accountsQuery.error} onRetry={() => accountsQuery.refetch()} className="py-16" />
      </SettingsSectionShell>
    );
  }

  const accounts = accountsQuery.data ?? [];
  const callbackUrl = `${env.apiBaseUrl}/instagram/webhook`;

  return (
    <SettingsSectionShell {...shellProps}>
      <div className="flex flex-col gap-6">
        {!canManage ? (
          <p className="text-sm text-foreground/60">Only the workspace owner can connect or disconnect Instagram.</p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            isDisabled={!canManage || oauth.connecting}
            onPress={() => void oauth.startConnect("instagram_login")}
          >
            <Camera className="size-4" aria-hidden="true" />
            {oauth.connecting ? "Connecting…" : "Connect with Instagram"}
          </Button>
          <Button
            variant="secondary"
            isDisabled={!canManage || oauth.connecting}
            onPress={() => void oauth.startConnect("facebook_pages")}
          >
            Connect with Facebook Pages
          </Button>
        </div>
        {oauth.error ? (
          <p role="alert" className="text-sm text-danger">
            {oauth.error}
          </p>
        ) : null}

        {accounts.length === 0 ? (
          <EmptyState
            title="No accounts connected"
            description="Connect an Instagram Business account above to start receiving DMs in Operatora."
          />
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-foreground">Connected accounts</p>
            {accounts.map((account) => (
              <AccountRow key={account.id} account={account} canManage={canManage} workspaceId={workspaceId} />
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2 border-t border-black/[0.08] pt-4 text-xs text-foreground/60 dark:border-white/[0.12]">
          <p className="font-medium text-foreground">Requirements</p>
          <ul className="list-inside list-disc space-y-1">
            <li>An Instagram Business or Creator account</li>
            <li>A connected Facebook Page (for the Facebook Pages flow)</li>
            <li>A Meta App configured with Operatora&apos;s redirect URI</li>
          </ul>
          <p className="mt-2 font-medium text-foreground">Webhook callback URL</p>
          <code className="block rounded-lg bg-black/[0.03] px-3 py-2 font-mono dark:bg-white/[0.05]">
            {callbackUrl}
          </code>
        </div>
      </div>

      <InstagramOAuthSelectDialog
        open={oauth.selectOpen}
        onOpenChange={oauth.setSelectOpen}
        selectionToken={oauth.selectionToken}
        options={oauth.options}
        workspaceId={workspaceId}
        userId={userId}
        onConnected={() => accountsQuery.refetch()}
      />
    </SettingsSectionShell>
  );
}
