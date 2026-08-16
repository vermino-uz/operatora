"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Input } from "@heroui/react";

import { publicLeadBoardApi } from "@/services/api/leadsPublicBoard";
import { formatLeadName } from "@/features/leads/types";
import { ApiError } from "@/types/api";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";

/**
 * Public, unauthenticated read-only board snapshot (Phase 2c-5, item 4) —
 * `GET /public/boards/:token`. Deliberately outside `(protected)`/`(auth)`
 * (no `AppShell` chrome, no auth guard — `src/proxy.ts`'s protected-prefix
 * list is derived from `ROUTES`, which this path was never added to, so it
 * stays reachable without a session) and NOT the old frontend's visual
 * design — a minimal, clean read-only render of the same data
 * (`ShareBoardDialog.tsx`'s doc comment explains why this page exists at
 * all: the share feature is meaningless without somewhere for the copied
 * link to actually resolve).
 */
export default function PublicBoardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [passwordInput, setPasswordInput] = useState("");
  const [submittedPassword, setSubmittedPassword] = useState<string | undefined>(undefined);

  const query = useQuery({
    queryKey: ["public-board", token, submittedPassword ?? ""],
    queryFn: () => publicLeadBoardApi.get(token, submittedPassword),
    // A wrong/missing password is expected user input, not a transient
    // failure — never auto-retry it (flood-prevention rule).
    retry: false,
  });

  const needsPassword = query.isError && query.error instanceof ApiError && query.error.isAuthError;
  const notFound = query.isError && query.error instanceof ApiError && query.error.isNotFound;

  return (
    <main className="mx-auto flex min-h-dvh max-w-6xl flex-col gap-4 p-6">
      {query.isLoading ? (
        <LoadingState label="Loading board…" />
      ) : notFound ? (
        <EmptyState title="Link not available" description="This share link is disabled, expired, or doesn't exist." />
      ) : needsPassword ? (
        <div className="mx-auto flex w-full max-w-sm flex-col gap-3 py-16">
          <h1 className="text-lg font-semibold text-foreground">Password required</h1>
          <p className="text-sm text-foreground/60">This board is password-protected.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSubmittedPassword(passwordInput);
            }}
            className="flex gap-2"
          >
            <Input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Password"
              autoFocus
            />
            <Button type="submit" variant="primary">
              Unlock
            </Button>
          </form>
          {submittedPassword != null ? <p className="text-sm text-danger">Incorrect password.</p> : null}
        </div>
      ) : query.isError ? (
        <EmptyState title="Something went wrong" description="Couldn't load this board. Try again shortly." />
      ) : query.data ? (
        <>
          <h1 className="text-xl font-semibold text-foreground">{query.data.board.name}</h1>
          <p className="text-xs text-foreground/50">Read-only shared view.</p>
          <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-4">
            {query.data.columns.map((column) => {
              const leads = query.data.leads.filter((l) => l.column_id === column.id);
              return (
                <div
                  key={column.id}
                  className="flex h-fit w-[280px] shrink-0 flex-col rounded-xl border border-black/[0.08] dark:border-white/[0.12]"
                >
                  <div className="flex items-center gap-2 border-b border-black/[0.08] px-3 py-2.5 dark:border-white/[0.12]">
                    {column.color ? (
                      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: column.color }} aria-hidden="true" />
                    ) : null}
                    <p className="truncate text-sm font-semibold text-foreground">{column.name}</p>
                    <span className="ml-auto text-xs text-foreground/40">{leads.length}</span>
                  </div>
                  <div className="flex flex-col gap-2 p-2">
                    {leads.length === 0 ? (
                      <p className="py-4 text-center text-xs text-foreground/40">No leads</p>
                    ) : (
                      leads.map((lead) => (
                        <div key={lead.id} className="rounded-lg border border-black/[0.08] p-2.5 dark:border-white/[0.12]">
                          <p className="truncate text-sm font-medium text-foreground">{formatLeadName(lead)}</p>
                          {lead.phone_number ? (
                            <p className="mt-0.5 truncate font-mono text-xs text-foreground/60">{lead.phone_number}</p>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </main>
  );
}
