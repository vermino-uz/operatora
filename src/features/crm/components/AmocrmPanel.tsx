"use client";

import { useState } from "react";
import { Button, Input, Label, TextField } from "@heroui/react";
import { Copy, Database, TrashBin, TriangleExclamation } from "@gravity-ui/icons";

import { ApiError } from "@/types/api";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import {
  useAmocrmPendingCredentialsMutation,
  useAmocrmStatusQuery,
  useConnectAmocrmMutation,
  useDisconnectAmocrmMutation,
  usePreviewAmocrmBoardsMutation,
  usePreviewAmocrmOperatorsMutation,
  useStartAmocrmImportMutation,
} from "@/features/crm/hooks/useAmocrm";
import type { AmocrmBoardPreview, AmocrmOperatorsPreview, AmocrmPendingCredential } from "@/features/crm/types";
import { AmocrmBoardsModal } from "@/features/crm/components/AmocrmBoardsModal";
import { AmocrmMappingModal } from "@/features/crm/components/AmocrmMappingModal";

function actionErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return "Only the workspace owner can manage the amoCRM connection.";
    if (error.isValidationError) return error.message;
    if (error.isServerError) return "Something went wrong on our end. Please try again shortly.";
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

/** amoCRM — connect via a long-lived private-integration access token (no
 * OAuth), preview boards/statuses and operators, then run a background
 * import job. Traced from `AmocrmIntegrationSettings.tsx` /
 * `amocrm.controller.ts`. Mutating routes are `assertWorkspaceOwner`-gated
 * server-side; a non-owner gets a 403 surfaced via `actionErrorMessage`
 * rather than a client-side pre-check (the old frontend didn't gate this
 * client-side either — there's no cheap "am I owner" signal on this
 * specific page without an extra request, and the 403 message is clear). */
export function AmocrmPanel() {
  const statusQuery = useAmocrmStatusQuery(true);
  const [subdomain, setSubdomain] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [boardsPreview, setBoardsPreview] = useState<AmocrmBoardPreview[] | null>(null);
  const [operatorsPreview, setOperatorsPreview] = useState<AmocrmOperatorsPreview | null>(null);
  const [selectedStatusIds, setSelectedStatusIds] = useState<number[]>([]);
  const [revealedCredentials, setRevealedCredentials] = useState<AmocrmPendingCredential[] | null>(null);

  const connect = useConnectAmocrmMutation();
  const disconnect = useDisconnectAmocrmMutation();
  const previewBoards = usePreviewAmocrmBoardsMutation();
  const previewOperators = usePreviewAmocrmOperatorsMutation();
  const startImport = useStartAmocrmImportMutation();
  const pendingCredentials = useAmocrmPendingCredentialsMutation();

  if (statusQuery.isLoading) return <LoadingState label="Loading amoCRM status…" className="py-10" />;
  if (statusQuery.isError) {
    return <ErrorState error={statusQuery.error} onRetry={() => statusQuery.refetch()} className="py-10" />;
  }

  const data = statusQuery.data;
  const importing = data?.status === "importing";
  const stats = data?.last_import_stats;

  async function handleConnect() {
    if (connect.isPending) return;
    setError(null);
    try {
      await connect.mutateAsync({ subdomain: subdomain.trim(), accessToken: accessToken.trim() });
      setAccessToken("");
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  }

  async function handleDisconnect() {
    if (disconnect.isPending || importing) return;
    setError(null);
    try {
      await disconnect.mutateAsync();
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  }

  async function handleOpenBoards() {
    setError(null);
    try {
      const res = await previewBoards.mutateAsync();
      setBoardsPreview(res.boards);
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  }

  async function handleBoardsConfirmed(statusIds: number[]) {
    setSelectedStatusIds(statusIds);
    setBoardsPreview(null);
    setError(null);
    try {
      const preview = await previewOperators.mutateAsync();
      const seatsShort =
        preview.seatAvailability.available !== null &&
        preview.seatAvailability.seatsNeeded > preview.seatAvailability.available;
      if (preview.existingOperators.length === 0 && !seatsShort) {
        // Nothing to map against and plenty of seats — skip straight to import.
        await startImport.mutateAsync({ selectedStatusIds: statusIds });
        return;
      }
      setOperatorsPreview(preview);
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  }

  async function handleMappingConfirmed(mapping: Record<string, { action: "map" | "skip"; operatorId?: string }>) {
    setError(null);
    try {
      await startImport.mutateAsync({ operatorMapping: mapping, selectedStatusIds });
      setOperatorsPreview(null);
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  }

  async function handleRevealCredentials() {
    setError(null);
    try {
      const res = await pendingCredentials.mutateAsync();
      setRevealedCredentials(res.credentials);
      void statusQuery.refetch();
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  }

  function copyCredentials(credentials: AmocrmPendingCredential[]) {
    const text = credentials.map((c) => `${c.email}\t${c.temp_password}`).join("\n");
    void navigator.clipboard.writeText(text);
  }

  const previewBusy = previewBoards.isPending || previewOperators.isPending || startImport.isPending;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Database className="size-4 text-foreground/60" aria-hidden="true" />
        <span className="text-sm font-semibold text-foreground">amoCRM</span>
      </div>
      <p className="text-sm text-foreground/60">
        Connect an amoCRM account using a long-lived private-integration access token, then import leads,
        pipelines and operators.
      </p>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {!data?.connected ? (
        <div className="flex flex-col gap-3 rounded-xl border border-black/[0.08] p-4 dark:border-white/[0.12]">
          <TextField value={subdomain} onChange={setSubdomain}>
            <Label>Subdomain</Label>
            <div className="flex items-center gap-2">
              <Input placeholder="mycompany" className="flex-1" />
              <span className="shrink-0 text-xs text-foreground/50">.amocrm.ru</span>
            </div>
          </TextField>
          <TextField value={accessToken} onChange={setAccessToken} type="password">
            <Label>Access token</Label>
            <Input placeholder="Long-lived private-integration token" />
          </TextField>
          <div>
            <Button
              isDisabled={connect.isPending || !subdomain.trim() || !accessToken.trim()}
              onPress={handleConnect}
            >
              {connect.isPending ? "Connecting…" : "Connect"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-xl border border-black/[0.08] p-4 dark:border-white/[0.12]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{data.subdomain}.amocrm.ru</p>
              <p className="mt-1 text-xs text-foreground/50">
                {importing
                  ? `Importing… ${stats?.leads_created ?? 0} created, ${stats?.leads_updated ?? 0} updated`
                  : data.last_import_at
                    ? `Last import: ${new Date(data.last_import_at).toLocaleString()}`
                    : "Never imported yet"}
              </p>
              {data.status === "failed" && stats?.error ? (
                <p className="mt-1 text-xs text-danger">{stats.error}</p>
              ) : null}
            </div>
            <Button
              size="sm"
              variant="danger-soft"
              isIconOnly
              aria-label="Disconnect"
              isDisabled={disconnect.isPending || importing}
              onPress={handleDisconnect}
            >
              <TrashBin className="size-4" aria-hidden="true" />
            </Button>
          </div>

          {stats && !importing ? (
            <div className="flex flex-col gap-0.5 text-xs text-foreground/60">
              <p>
                {stats.leads_created ?? 0} created, {stats.leads_updated ?? 0} updated, {stats.leads_failed ?? 0}{" "}
                failed
              </p>
              {(stats.leads_skipped ?? 0) > 0 ? <p>{stats.leads_skipped} skipped</p> : null}
            </div>
          ) : null}

          {stats?.operators_seat_limit_hit && !importing ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
              <p className="flex items-center gap-1.5">
                <TriangleExclamation className="size-3.5 shrink-0" aria-hidden="true" />
                {stats.operators_not_imported ?? 0} operator(s) could not be imported — seat limit reached.
              </p>
            </div>
          ) : null}

          <div>
            <Button variant="secondary" isDisabled={previewBusy || importing} onPress={handleOpenBoards}>
              {importing ? "Importing…" : previewBusy ? "Loading…" : "Import now"}
            </Button>
          </div>

          {data.hasPendingOperatorCredentials && revealedCredentials === null ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs">
              <p>New operator accounts were created with temporary passwords.</p>
              <Button size="sm" isDisabled={pendingCredentials.isPending} onPress={handleRevealCredentials}>
                {pendingCredentials.isPending ? "Loading…" : "View credentials"}
              </Button>
            </div>
          ) : null}

          {revealedCredentials !== null ? (
            <div className="flex flex-col gap-2 rounded-lg border border-black/[0.08] bg-black/[0.02] p-3 dark:border-white/[0.12] dark:bg-white/[0.04]">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-foreground">
                  Save these now — shown only once
                </p>
                {revealedCredentials.length > 0 ? (
                  <Button size="sm" variant="secondary" onPress={() => copyCredentials(revealedCredentials)}>
                    <Copy className="size-3.5" aria-hidden="true" />
                    Copy
                  </Button>
                ) : null}
              </div>
              {revealedCredentials.length === 0 ? (
                <p className="text-xs text-foreground/50">No pending credentials.</p>
              ) : (
                <div className="flex max-h-[200px] flex-col gap-1 overflow-y-auto font-mono text-xs">
                  {revealedCredentials.map((c) => (
                    <div key={c.email} className="flex items-center justify-between gap-3">
                      <span className="text-foreground">{c.email}</span>
                      <span className="text-foreground/60">{c.temp_password}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      <AmocrmBoardsModal boards={boardsPreview} onClose={() => setBoardsPreview(null)} onConfirm={handleBoardsConfirmed} />
      <AmocrmMappingModal
        preview={operatorsPreview}
        onClose={() => setOperatorsPreview(null)}
        onConfirm={handleMappingConfirmed}
        submitting={startImport.isPending}
      />
    </div>
  );
}
