"use client";

import { useState } from "react";
import { Button, Chip } from "@heroui/react";
import { ArrowRotateRight, ArrowUpRightFromSquare, Filmstrip, Lock } from "@gravity-ui/icons";

import { useSessionStore } from "@/state/session-store";
import { ApiError } from "@/types/api";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { SettingsSectionShell } from "@/features/settings/components/SettingsSectionShell";
import { useMyWorkspacePermissionsQuery } from "@/features/roles/hooks/useWorkspaceRolesQuery";
import {
  useHiggsfieldBalanceQuery,
  useHiggsfieldConnectMutation,
  useHiggsfieldDisconnectMutation,
  useHiggsfieldStatusQuery,
} from "@/features/higgsfield/hooks/useHiggsfield";
import { openOAuthPopup } from "@/lib/oauthPopup";

function actionErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return "You don't have permission to manage this connection.";
    if (error.isServerError) return "Something went wrong on our end. Please try again shortly.";
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

const ACCESS_COPY: Record<string, { badge: string; description: string }> = {
  unlimited: { badge: "Included", description: "Connect your Higgsfield account for AI image and video generation in chat." },
  soon: { badge: "Coming soon", description: "Higgsfield MCP is coming soon on your plan." },
  unavailable: { badge: "Not on your plan", description: "Upgrade your plan to connect Higgsfield MCP." },
  expired: { badge: "Plan expired", description: "Renew your plan to reconnect Higgsfield MCP." },
};

/**
 * Higgsfield MCP — see `features/higgsfield/types.ts` for the confirmed
 * `/higgsfield/*` contract and how this relates to AI Chat's
 * `higgsfield_connect` card. Connect/disconnect gated to workspace
 * owner/admin (server-enforced via `isWorkspaceOwnerOrAdmin`), reproduced
 * client-side the same way as Telegram/Instagram's owner checks.
 */
export function HiggsfieldSettingsPanel() {
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const statusQuery = useHiggsfieldStatusQuery(workspaceId);
  const permissionsQuery = useMyWorkspacePermissionsQuery(workspaceId);
  const connect = useHiggsfieldConnectMutation(workspaceId);
  const disconnect = useHiggsfieldDisconnectMutation(workspaceId);
  const [error, setError] = useState<string | null>(null);

  const canManage =
    permissionsQuery.data?.workspace_role === "workspace_owner" ||
    permissionsQuery.data?.workspace_role === "owner" ||
    permissionsQuery.data?.workspace_role === "workspace_admin" ||
    permissionsQuery.data?.workspace_role === "admin";

  const connected = !!statusQuery.data?.connected;
  const balanceQuery = useHiggsfieldBalanceQuery(workspaceId, connected);

  const shellProps = {
    title: "Higgsfield MCP",
    subtitle: "Connect Higgsfield MCP for AI image and video generation.",
  } as const;

  if (!workspaceId) {
    return (
      <SettingsSectionShell {...shellProps}>
        <ErrorState error={new Error("No workspace selected")} />
      </SettingsSectionShell>
    );
  }

  if (statusQuery.isLoading) {
    return (
      <SettingsSectionShell {...shellProps}>
        <LoadingState label="Loading Higgsfield status…" className="py-16" />
      </SettingsSectionShell>
    );
  }

  if (statusQuery.isError) {
    return (
      <SettingsSectionShell {...shellProps}>
        <ErrorState error={statusQuery.error} onRetry={() => statusQuery.refetch()} className="py-16" />
      </SettingsSectionShell>
    );
  }

  const status = statusQuery.data;
  if (!status) {
    return (
      <SettingsSectionShell {...shellProps}>
        <LoadingState label="Loading Higgsfield status…" className="py-16" />
      </SettingsSectionShell>
    );
  }
  const access = status.access === "read_only" ? "expired" : (status.higgsfieldMcpAccess ?? "unavailable");
  const canUseHiggsfield = status.canUseHiggsfield ?? (access === "unlimited");
  const accessCopy = ACCESS_COPY[access] ?? ACCESS_COPY.unavailable!;

  async function handleConnect() {
    if (connect.isPending) return; // guard double-submit
    setError(null);
    try {
      const language = (navigator.language || "en").slice(0, 2);
      const { authorizeUrl } = await connect.mutateAsync(language);
      const popup = openOAuthPopup(authorizeUrl, "operatora-higgsfield-oauth");
      if (!popup) {
        window.location.href = authorizeUrl;
        return;
      }
      const poll = window.setInterval(() => {
        if (popup.closed) {
          window.clearInterval(poll);
          void statusQuery.refetch();
        }
      }, 500);
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
    <SettingsSectionShell {...shellProps}>
      <div className="flex flex-col gap-5">
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}

        <div className="rounded-xl border border-black/[0.08] p-5 dark:border-white/[0.12]">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-black/[0.04] dark:bg-white/[0.06]">
              {access === "unavailable" || access === "expired" ? (
                <Lock className="size-5 text-foreground/60" aria-hidden="true" />
              ) : (
                <Filmstrip className="size-5 text-foreground/60" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-foreground">Higgsfield MCP</p>
                <Chip size="sm" variant="soft" color={access === "unlimited" ? "success" : access === "soon" ? "warning" : "default"}>
                  <Chip.Label>{accessCopy.badge}</Chip.Label>
                </Chip>
                {canUseHiggsfield ? (
                  <Chip size="sm" variant="soft" color={connected ? "success" : "default"}>
                    <Chip.Label>{connected ? "Connected" : "Not connected"}</Chip.Label>
                  </Chip>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-foreground/60">
                {canUseHiggsfield
                  ? "Connect your Higgsfield account — a sign-in popup opens, no API key needed."
                  : accessCopy.description}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {!canManage ? (
              <p className="text-xs text-foreground/50">Only a workspace owner or admin can connect or disconnect this integration.</p>
            ) : connected ? (
              <Button size="sm" variant="secondary" isDisabled={disconnect.isPending} onPress={() => void handleDisconnect()}>
                {disconnect.isPending ? "Disconnecting…" : "Disconnect"}
              </Button>
            ) : canUseHiggsfield ? (
              <Button size="sm" isDisabled={connect.isPending} onPress={() => void handleConnect()}>
                {connect.isPending ? "Opening Higgsfield…" : "Connect"}
              </Button>
            ) : (access === "unavailable" || access === "expired") ? (
              <a
                href="/settings?section=billing"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-black/[0.08] px-4 text-sm font-medium text-foreground hover:bg-black/[0.02] dark:border-white/[0.12] dark:hover:bg-white/[0.04]"
              >
                View plans
              </a>
            ) : null}
            <a
              href="https://higgsfield.ai/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-foreground/70 hover:text-foreground"
            >
              higgsfield.ai
              <ArrowUpRightFromSquare className="size-3" aria-hidden="true" />
            </a>
            {connected && canUseHiggsfield ? (
              <Button size="sm" variant="ghost" className="ml-auto" onPress={() => void statusQuery.refetch()}>
                <ArrowRotateRight className="size-3.5" aria-hidden="true" />
                Refresh
              </Button>
            ) : null}
          </div>
        </div>

        {connected && canUseHiggsfield ? (
          <div className="rounded-xl border border-black/[0.08] p-5 dark:border-white/[0.12]">
            <p className="mb-2 text-sm font-semibold text-foreground">Balance</p>
            {balanceQuery.isLoading ? (
              <LoadingState label="Loading balance…" className="py-4" />
            ) : balanceQuery.data?.ok && balanceQuery.data.text ? (
              <pre className="font-sans text-sm leading-relaxed whitespace-pre-wrap text-foreground/70">{balanceQuery.data.text}</pre>
            ) : (
              <p className="text-sm text-foreground/50">Balance unavailable right now.</p>
            )}
          </div>
        ) : null}
      </div>
    </SettingsSectionShell>
  );
}
