"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@heroui/react";
import { Check, Copy, TriangleExclamationFill } from "@gravity-ui/icons";

import { useCreateMcpKeyMutation } from "@/features/mcp-keys/hooks/useMcpKeys";
import { env } from "@/config/env";
import { ApiError } from "@/types/api";
import { LoadingState } from "@/components/shared/LoadingState";
import { ROUTES } from "@/constants/routes";

type Status = "loading" | "success" | "unauthenticated" | "error";

/**
 * `/extension-connect` — reached in a new tab by the Meet Recorder Chrome
 * extension's "Connect to Operatora" action. Ported from the old app's
 * `ExtensionConnect.tsx` (read-only reference): mints a scoped API key for
 * the signed-in workspace and broadcasts it via a `CustomEvent` so the
 * extension's content-script bridge (which listens on this exact path) can
 * pick it up without ever touching the user's password/session token
 * directly.
 *
 * Reuses this app's own real `POST /mcp-keys` endpoint (`useCreateMcpKeyMutation`
 * — see `features/mcp-keys/types.ts` for the confirmed contract) rather than
 * the old app's separate `extensionConnectApi.ts` helper, since both call
 * the exact same backend route; `apiFetch` already attaches the signed-in
 * user's Bearer token automatically, so a 401 here means "not logged in",
 * not "endpoint doesn't exist".
 */
export function ExtensionConnectView() {
  const createKey = useCreateMcpKeyMutation();
  const [status, setStatus] = useState<Status>("loading");
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return; // guard StrictMode double-invoke / re-mount
    startedRef.current = true;

    let cancelled = false;
    (async () => {
      try {
        const minted = await createKey.mutateAsync({ name: "Meet Recorder Extension", scopes: ["write"] });
        if (cancelled) return;
        setApiKey(minted.raw);
        setStatus("success");
        window.dispatchEvent(
          new CustomEvent("operatora-extension-connect", {
            detail: { apiKey: minted.raw, apiBase: env.apiBaseUrl },
          }),
        );
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.isAuthError) {
          setStatus("unauthenticated");
        } else {
          setStatus("error");
          setMessage(err instanceof ApiError ? err.message : "Failed to connect.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire exactly once, mutation identity is stable enough here
  }, []);

  async function copyKey() {
    if (!apiKey) return;
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-2xl border border-black/[0.08] p-8 dark:border-white/[0.12]">
        <div className="flex flex-col items-center gap-4 text-center">
          {status === "loading" ? (
            <>
              <LoadingState label="Connecting Meet Recorder…" />
            </>
          ) : null}

          {status === "success" ? (
            <>
              <Check className="size-12 text-success" aria-hidden="true" />
              <h2 className="text-xl font-semibold text-foreground">Connected</h2>
              <p className="text-sm text-foreground/60">
                The extension should pick this up automatically — you can close this tab. If it doesn&apos;t, copy
                the key below into the extension&apos;s options page.
              </p>
              <div className="flex w-full items-center gap-2">
                <code className="flex-1 truncate rounded-lg border border-black/[0.08] px-3 py-2 text-xs dark:border-white/[0.12]">
                  {apiKey}
                </code>
                <Button size="sm" variant="secondary" onPress={() => void copyKey()} aria-label="Copy API key">
                  {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
                </Button>
              </div>
            </>
          ) : null}

          {status === "unauthenticated" ? (
            <>
              <TriangleExclamationFill className="size-12 text-danger" aria-hidden="true" />
              <h2 className="text-xl font-semibold text-foreground">Please log in first</h2>
              <p className="text-sm text-foreground/60">Log into Operatora, then reopen this tab from the extension.</p>
              <a href={ROUTES.login} className="text-sm font-medium text-accent underline underline-offset-2">
                Go to login
              </a>
            </>
          ) : null}

          {status === "error" ? (
            <>
              <TriangleExclamationFill className="size-12 text-danger" aria-hidden="true" />
              <h2 className="text-xl font-semibold text-foreground">Connection failed</h2>
              <p className="text-sm text-foreground/60">{message}</p>
              <Button size="sm" variant="secondary" onPress={() => window.location.reload()}>
                Try again
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
