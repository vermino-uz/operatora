"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { Copy, Check } from "@gravity-ui/icons";

import { ApiError } from "@/types/api";
import {
  useDepartmentBotUsernameQuery,
  useGenerateWorkspaceGroupVerifyCodeMutation,
  useWorkspaceGroupQuery,
} from "@/features/departments/hooks/useDepartments";
import type { WorkspaceGroupStatus } from "@/features/departments/types";

function isCodePending(g: WorkspaceGroupStatus | undefined): boolean {
  return Boolean(
    g?.group_verify_code &&
      g?.group_verify_expires_at &&
      new Date(g.group_verify_expires_at).getTime() > Date.now(),
  );
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return "Only workspace owners/admins can manage the escalation group.";
    return error.message;
  }
  return "Couldn't generate a connect code. Please try again.";
}

/**
 * One shared Telegram group per workspace, used by every "Group" notify-mode
 * department. `GET /departments/workspace-group` + `POST
 * /departments/workspace-group/verify-code` — matches the old frontend's
 * `WorkspaceGroupConnect.tsx` exactly.
 */
export function WorkspaceGroupConnect() {
  const groupQuery = useWorkspaceGroupQuery();
  const generateCode = useGenerateWorkspaceGroupVerifyCodeMutation();
  const botUsernameQuery = useDepartmentBotUsernameQuery();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const group = groupQuery.data;
  const pending = isCodePending(group);

  async function generate() {
    if (generateCode.isPending) return; // guard double-submit
    setError(null);
    try {
      await generateCode.mutateAsync();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="rounded-xl border border-black/[0.08] p-4 dark:border-white/[0.12]">
      <p className="text-sm font-medium text-foreground">Escalation group</p>
      <p className="mt-0.5 text-sm text-foreground/60">
        One shared Telegram group for the whole workspace — every department set to &quot;Group&quot; posts its
        escalations here.
      </p>

      <div className="mt-3">
        {group?.group_chat_id && !pending ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground">{group.group_chat_id}</span>
            <span className="text-xs font-medium text-success">Connected</span>
            <Button size="sm" variant="ghost" onPress={generate} isDisabled={generateCode.isPending}>
              {generateCode.isPending ? "Reconnecting…" : "Reconnect"}
            </Button>
          </div>
        ) : pending ? (
          <div className="rounded-lg border border-black/[0.08] bg-black/[0.02] p-3 text-sm text-foreground/70 dark:border-white/[0.12] dark:bg-white/[0.04]">
            <p>
              {botUsernameQuery.data
                ? `1. Add @${botUsernameQuery.data} to the Telegram group.`
                : "1. Add your bot to the Telegram group."}
            </p>
            <p className="mt-1">2. Send this in the group:</p>
            <div className="mt-1.5 flex items-center gap-2">
              <code className="rounded bg-black/[0.04] px-2 py-1 text-sm font-mono text-foreground dark:bg-white/[0.08]">
                /connect {group?.group_verify_code}
              </code>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(`/connect ${group?.group_verify_code}`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                aria-label="Copy connect command"
                className="text-foreground/50 hover:text-foreground"
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              </button>
            </div>
            <p className="mt-1.5 text-foreground/50">Waiting for the code…</p>
          </div>
        ) : (
          <Button size="sm" variant="secondary" onPress={generate} isDisabled={generateCode.isPending}>
            {generateCode.isPending ? "Connecting…" : "Connect a group"}
          </Button>
        )}
        {error ? (
          <p role="alert" className="mt-2 text-sm text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
