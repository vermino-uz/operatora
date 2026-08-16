"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Chip,
  Input,
  Label,
  ListBox,
  Select,
  TextField,
  useOverlayState,
  Modal,
} from "@heroui/react";
import { Check, Copy, Key, TrashBin } from "@gravity-ui/icons";

import { env } from "@/config/env";
import { ApiError } from "@/types/api";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { SettingsSectionShell } from "@/features/settings/components/SettingsSectionShell";
import {
  useCreateMcpKeyMutation,
  useMcpKeysQuery,
  useRevokeMcpKeyMutation,
} from "@/features/mcp-keys/hooks/useMcpKeys";
import { MCP_SCOPE_OPTIONS, type McpApiKey, type McpApiKeyCreated, type McpScope } from "@/features/mcp-keys/types";

/** Backend host, not the frontend host — the MCP endpoint is served by the
 * API (`/api/mcp`), which lives on a different origin from this app. */
const MCP_URL = `${env.apiBaseUrl}/mcp`;

function actionErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isValidationError) return error.message;
    if (error.isServerError) return "Something went wrong on our end. Please try again shortly.";
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      variant="secondary"
      onPress={() => {
        void navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function CodeBlock({ text }: { text: string }) {
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-lg border border-black/[0.08] bg-black/[0.03] p-4 pr-24 font-mono text-xs leading-relaxed whitespace-pre text-foreground dark:border-white/[0.12] dark:bg-white/[0.04]">
        {text}
      </pre>
      <div className="absolute top-2.5 right-2.5">
        <CopyButton text={text} />
      </div>
    </div>
  );
}

function scopeChip(scopes: McpScope[]) {
  if (scopes.includes("send")) return { label: "Read, write & send", color: "warning" as const };
  if (scopes.includes("write")) return { label: "Read & write", color: "accent" as const };
  return { label: "Read only", color: "default" as const };
}

function ConnectInstructions() {
  return (
    <div className="flex flex-col gap-5 rounded-xl border border-black/[0.08] p-5 dark:border-white/[0.12]">
      <div>
        <p className="text-sm font-semibold text-foreground">Connect Claude Code</p>
        <div className="mt-2">
          <CodeBlock text={`claude mcp add --transport http operatora ${MCP_URL}`} />
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">Connect Claude Desktop / Claude.ai</p>
        <div className="mt-2">
          <CodeBlock text={MCP_URL} />
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">Connect ChatGPT</p>
        <p className="mt-1 text-sm text-foreground/60">
          In ChatGPT, add a custom connector using this MCP server URL.
        </p>
        <div className="mt-2">
          <CodeBlock text={MCP_URL} />
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">Connect Codex</p>
        <div className="mt-2">
          <CodeBlock text={`codex mcp add operatora --url ${MCP_URL}\ncodex mcp login operatora`} />
        </div>
      </div>
      <p className="text-xs text-foreground/50">
        These clients sign in with your own Operatora account — no key to copy or paste. The API keys below are only
        for tools that cannot open a browser sign-in.
      </p>
    </div>
  );
}

function KeyCreatedPanel({ created, onDone }: { created: McpApiKeyCreated; onDone: () => void }) {
  const config = useMemo(
    () =>
      JSON.stringify(
        {
          mcpServers: {
            operatora: {
              command: "npx",
              args: ["-y", "mcp-remote", MCP_URL, "--header", "x-api-key:${OPERATORA_KEY}"],
              env: { OPERATORA_KEY: created.raw },
            },
          },
        },
        null,
        2,
      ),
    [created.raw],
  );

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-success/30 bg-success/5 p-5">
      <div className="flex items-center gap-2">
        <Check className="size-5 text-success" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-success">Key created</h3>
      </div>
      <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-2.5 text-xs text-warning-700 dark:text-warning-300">
        Copy this key now — it will never be shown again.
      </div>
      <div>
        <p className="mb-2 text-sm font-medium text-foreground">API key</p>
        <div className="flex gap-2">
          <Input value={created.raw} readOnly className="flex-1 font-mono text-sm" aria-label="New API key" />
          <CopyButton text={created.raw} />
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium text-foreground">MCP config with this key</p>
        <CodeBlock text={config} />
      </div>
      <div>
        <Button onPress={onDone}>Done</Button>
      </div>
    </div>
  );
}

/**
 * Claude / ChatGPT — MCP API key management. See
 * `features/mcp-keys/types.ts` for the confirmed `/mcp-keys/*` contract.
 * Not related to AI Chat's model picker (`features/chat/`); this manages
 * keys that let EXTERNAL AI clients pull/push Operatora data over MCP.
 */
export function McpKeysPanel() {
  const keysQuery = useMcpKeysQuery();
  const createKey = useCreateMcpKeyMutation();
  const revokeKey = useRevokeMcpKeyMutation();

  const [name, setName] = useState("");
  const [scope, setScope] = useState<McpScope>("write");
  const [created, setCreated] = useState<McpApiKeyCreated | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<McpApiKey | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const revokeDialog = useOverlayState();

  async function handleCreate() {
    if (createKey.isPending) return; // guard double-submit
    const trimmed = name.trim();
    if (!trimmed) {
      setCreateError("Enter a name for this key.");
      return;
    }
    setCreateError(null);
    try {
      const scopes: McpScope[] = scope === "send" ? ["read", "write", "send"] : scope === "write" ? ["read", "write"] : ["read"];
      const result = await createKey.mutateAsync({ name: trimmed, scopes });
      setCreated(result);
      setName("");
    } catch (err) {
      setCreateError(actionErrorMessage(err));
    }
  }

  function askRevoke(key: McpApiKey) {
    setRevokeTarget(key);
    setRevokeError(null);
    revokeDialog.open();
  }

  async function handleRevoke() {
    if (!revokeTarget || revokeKey.isPending) return;
    setRevokeError(null);
    try {
      await revokeKey.mutateAsync(revokeTarget.id);
      revokeDialog.close();
      setRevokeTarget(null);
    } catch (err) {
      setRevokeError(actionErrorMessage(err));
    }
  }

  const shellProps = {
    title: "Claude / ChatGPT",
    subtitle: "Connect Claude or ChatGPT via MCP — analyze leads, keep agent data up to date.",
  } as const;

  return (
    <SettingsSectionShell {...shellProps} wide>
      <div className="flex max-w-[840px] flex-col gap-8">
        <ConnectInstructions />

        {created ? <KeyCreatedPanel created={created} onDone={() => setCreated(null)} /> : null}

        <div className="rounded-xl border border-black/[0.08] p-5 dark:border-white/[0.12]">
          <p className="text-sm font-semibold text-foreground">Create an API key</p>
          <p className="mt-1 text-sm text-foreground/60">
            For MCP clients that cannot sign in with a browser (config-file only).
          </p>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
            <TextField className="flex-1" aria-label="Key name">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Claude Desktop connector"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleCreate();
                }}
              />
            </TextField>
            <Select
              aria-label="Scope"
              value={scope}
              onChange={(key) => {
                if (typeof key === "string") setScope(key as McpScope);
              }}
              className="sm:w-64"
            >
              <Label>Scope</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox items={MCP_SCOPE_OPTIONS.map((o) => ({ id: o.value, label: o.label }))}>
                  {(opt) => (
                    <ListBox.Item id={opt.id} textValue={opt.label}>
                      {opt.label}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  )}
                </ListBox>
              </Select.Popover>
            </Select>
            <Button isDisabled={createKey.isPending} onPress={() => void handleCreate()}>
              <Key className="size-3.5" aria-hidden="true" />
              {createKey.isPending ? "Generating…" : "Generate key"}
            </Button>
          </div>
          {createError ? (
            <p role="alert" className="mt-3 text-sm text-danger">
              {createError}
            </p>
          ) : null}
          <p className="mt-3 text-xs text-foreground/50">
            {MCP_SCOPE_OPTIONS.find((o) => o.value === scope)?.hint}
          </p>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-foreground">Existing keys</p>
          {keysQuery.isLoading ? (
            <LoadingState label="Loading API keys…" className="py-10" />
          ) : keysQuery.isError ? (
            <ErrorState error={keysQuery.error} onRetry={() => keysQuery.refetch()} className="py-10" />
          ) : (keysQuery.data ?? []).length === 0 ? (
            <EmptyState
              title="No API keys yet"
              description="Generate one above for MCP clients that can't sign in with a browser."
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-black/[0.08] dark:border-white/[0.12]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/[0.08] text-left text-xs text-foreground/50 dark:border-white/[0.12]">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Key</th>
                    <th className="px-4 py-3 font-medium">Scope</th>
                    <th className="px-4 py-3 font-medium">Last active</th>
                    <th className="px-4 py-3 text-right font-medium">&nbsp;</th>
                  </tr>
                </thead>
                <tbody>
                  {(keysQuery.data ?? []).map((k) => {
                    const chip = scopeChip(k.scopes);
                    return (
                      <tr key={k.id} className="border-b border-black/[0.08] last:border-0 dark:border-white/[0.12]">
                        <td className="px-4 py-3 font-medium text-foreground">{k.name}</td>
                        <td className="px-4 py-3 font-mono text-foreground/60">{k.key_prefix}…</td>
                        <td className="px-4 py-3">
                          <Chip size="sm" color={chip.color} variant="soft">
                            <Chip.Label>{chip.label}</Chip.Label>
                          </Chip>
                        </td>
                        <td className="px-4 py-3 text-foreground/50">{fmtDate(k.last_used_at)}</td>
                        <td className="px-4 py-3 text-right">
                          <Button size="sm" variant="danger-soft" onPress={() => askRevoke(k)}>
                            <TrashBin className="size-3.5" aria-hidden="true" />
                            Revoke
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={revokeDialog.isOpen} onOpenChange={(open) => !open && revokeDialog.close()}>
        <Modal.Backdrop>
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Revoke &ldquo;{revokeTarget?.name}&rdquo;?</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="text-sm text-foreground/70">
                  Any MCP client using this key will lose access immediately. This can&apos;t be undone.
                </p>
                {revokeError ? (
                  <p role="alert" className="mt-3 text-sm text-danger">
                    {revokeError}
                  </p>
                ) : null}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" isDisabled={revokeKey.isPending} onPress={() => revokeDialog.close()}>
                  Cancel
                </Button>
                <Button variant="danger" isDisabled={revokeKey.isPending} onPress={() => void handleRevoke()}>
                  {revokeKey.isPending ? "Revoking…" : "Revoke"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </SettingsSectionShell>
  );
}
