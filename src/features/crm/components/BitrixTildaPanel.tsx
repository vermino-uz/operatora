"use client";

import { useState } from "react";
import { Button, Modal } from "@heroui/react";
import { Copy, Link as LinkIcon, Plus, TrashBin } from "@gravity-ui/icons";

import { ApiError } from "@/types/api";
import { env } from "@/config/env";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  useCreateIntegrationMutation,
  useDeleteIntegrationMutation,
  useIntegrationsQuery,
} from "@/features/crm/hooks/useIntegrations";
import { DEFAULT_BITRIX_FIELD_MAPPINGS, type IntegrationConnection } from "@/features/crm/types";

function actionErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isValidationError) return error.message;
    if (error.isServerError) return "Something went wrong on our end. Please try again shortly.";
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

function DeleteConfirm({
  connection,
  onClose,
  onConfirm,
  busy,
}: {
  connection: IntegrationConnection | null;
  onClose: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  return (
    <Modal isOpen={!!connection} onOpenChange={(open) => !open && !busy && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="sm">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Delete connection</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p className="text-sm text-foreground/70">
                Remove &ldquo;{connection?.name}&rdquo;? Its webhook URL stops accepting new leads immediately.
              </p>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" isDisabled={busy} onPress={onClose}>
                Cancel
              </Button>
              <Button variant="danger" isDisabled={busy} onPress={onConfirm}>
                {busy ? "Deleting…" : "Delete"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function ConnectionCard({ connection, onDelete }: { connection: IntegrationConnection; onDelete: () => void }) {
  // `connection.webhook_url` is the backend's full mount path, already
  // including its own `/api` prefix (`/api/public/integrations/webhook/:secret`
  // — confirmed in `integrations.service.ts`), so it's joined onto the
  // origin (`env.wsUrl`, `/api` already stripped), not `env.apiBaseUrl`
  // (which would double up `/api/api/...`).
  const fullWebhookUrl = `${env.wsUrl}${connection.webhook_url}`;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-black/[0.08] p-4 dark:border-white/[0.12]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <LinkIcon className="size-4 text-foreground/60" aria-hidden="true" />
          <span className="text-sm font-semibold text-foreground">{connection.name}</span>
          <span className="rounded bg-black/[0.05] px-1.5 py-0.5 text-[10px] uppercase text-foreground/60 dark:bg-white/[0.08]">
            {connection.provider}
          </span>
        </div>
        <Button size="sm" variant="danger-soft" isIconOnly aria-label="Delete" onPress={onDelete}>
          <TrashBin className="size-3.5" aria-hidden="true" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <code className="flex-1 break-all rounded-lg bg-black/[0.03] px-3 py-2 text-xs dark:bg-white/[0.05]">
          {fullWebhookUrl}
        </code>
        <Button
          size="sm"
          variant="secondary"
          isIconOnly
          aria-label="Copy webhook URL"
          onPress={() => void navigator.clipboard.writeText(fullWebhookUrl)}
        >
          <Copy className="size-3.5" aria-hidden="true" />
        </Button>
      </div>

      {connection.field_mappings && connection.field_mappings.length > 0 ? (
        <p className="text-xs text-foreground/50">
          Field maps: {connection.field_mappings.map((m) => `${m.external_field} → ${m.lead_field}`).join(", ")}
        </p>
      ) : null}
    </div>
  );
}

/** Bitrix24 + Tilda — generic `integration_connections` CRUD, traced from
 * `BitrixIntegrationSettings.tsx` / `integrations.controller.ts`. Not
 * gated to workspace owners server-side (confirmed in the controller), so
 * any authenticated workspace member sees full create/delete controls. */
export function BitrixTildaPanel() {
  const listQuery = useIntegrationsQuery(true);
  const create = useCreateIntegrationMutation();
  const remove = useDeleteIntegrationMutation();
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<IntegrationConnection | null>(null);

  async function handleCreateBitrix() {
    if (create.isPending) return;
    setError(null);
    try {
      await create.mutateAsync({
        provider: "bitrix24",
        name: "Bitrix24",
        field_mappings: DEFAULT_BITRIX_FIELD_MAPPINGS,
      });
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  }

  async function handleCreateTilda() {
    if (create.isPending) return;
    setError(null);
    try {
      await create.mutateAsync({ provider: "tilda", name: "Tilda" });
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  }

  async function handleDelete() {
    if (!pendingDelete || remove.isPending) return;
    setError(null);
    try {
      await remove.mutateAsync(pendingDelete.id);
      setPendingDelete(null);
    } catch (err) {
      setError(actionErrorMessage(err));
    }
  }

  if (listQuery.isLoading) return <LoadingState label="Loading connections…" className="py-10" />;
  if (listQuery.isError) {
    return <ErrorState error={listQuery.error} onRetry={() => listQuery.refetch()} className="py-10" />;
  }

  const connections = listQuery.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-foreground/60">
        Every workspace can accept leads via a public API, or set up dedicated Bitrix24/Tilda webhook
        connections below.
      </p>

      <div className="flex flex-col gap-2 rounded-xl border border-black/[0.08] p-4 dark:border-white/[0.12]">
        <p className="text-xs font-semibold text-foreground/70">Public lead intake API</p>
        <code className="block break-all rounded-lg bg-black/[0.03] px-3 py-2 text-xs dark:bg-white/[0.05]">
          POST {env.apiBaseUrl}/public/v1/leads
          <br />
          Header: x-api-key: &lt;your workspace API key&gt;
        </code>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="rounded-xl border border-black/[0.08] p-4 dark:border-white/[0.12]">
        <p className="text-sm font-semibold text-foreground">Tilda</p>
        <p className="mt-1 text-xs text-foreground/60">
          Create a connection, copy its webhook URL, then paste it into your Tilda form&apos;s webhook
          notification setting. Name/Phone/Email fields are auto-mapped; any extra inputs are stored on the
          lead as-is.
        </p>
        <div className="mt-3">
          <Button isDisabled={create.isPending} onPress={handleCreateTilda}>
            <Plus className="size-3.5" aria-hidden="true" />
            Connect Tilda
          </Button>
        </div>
      </div>

      <div>
        <Button variant="secondary" isDisabled={create.isPending} onPress={handleCreateBitrix}>
          <Plus className="size-3.5" aria-hidden="true" />
          Add Bitrix24
        </Button>
      </div>

      {connections.length === 0 ? (
        <EmptyState title="No connections yet" description="Add Tilda or Bitrix24 above to get a webhook URL." />
      ) : (
        <div className="flex flex-col gap-3">
          {connections.map((c) => (
            <ConnectionCard key={c.id} connection={c} onDelete={() => setPendingDelete(c)} />
          ))}
        </div>
      )}

      <DeleteConfirm
        connection={pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        busy={remove.isPending}
      />
    </div>
  );
}
