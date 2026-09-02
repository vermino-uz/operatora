"use client";

import { useEffect, useState } from "react";
import {
  Ban,
  Magnifier as Search,
  Pencil,
  PersonXmark,
  SquareXmark,
  ArrowRotateRight,
} from "@gravity-ui/icons";

import { useSessionStore } from "@/state/session-store";
import { initialsFor } from "@/features/messages/types";
import { pickAvatarColor } from "@/features/messages/lib/telegramSender";
import { searchCustomers } from "@/services/api/agentic";
import type { AgenticChannel, BlacklistedChat, CustomerSearchResult } from "@/services/api/agentic";
import { useBlacklist, useSetChatExcluded } from "@/features/messages/hooks/useAgentic";
import { AGENTIC_AVATAR_PALETTE } from "@/features/messages/components/agentic/types";
import { INPUT_CLS } from "@/features/messages/components/agentic/constants";
import { StatusBanner } from "@/features/messages/components/agentic/agenticUi";

export interface AgenticBlacklistManagerProps {
  active: boolean;
  channel?: AgenticChannel;
}

export function AgenticBlacklistManager({ active, channel = "telegram" }: AgenticBlacklistManagerProps) {
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const { data: blacklist = [], isLoading } = useBlacklist(active, channel);
  const setExcluded = useSetChatExcluded(channel);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [reasonTargetId, setReasonTargetId] = useState<string | null>(null);
  const [reasonDraft, setReasonDraft] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    const term = query.trim();
    if (!term || !workspaceId) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const r = await searchCustomers(term, workspaceId, channel);
        if (!cancelled) setResults(r);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, channel, workspaceId]);

  const blacklistedIds = new Set(blacklist.map((b) => b.chat_id));

  function cancelReason() {
    setReasonTargetId(null);
    setReasonDraft("");
  }

  async function confirmBlacklist(chatId: string, name: string | null) {
    try {
      await setExcluded.mutateAsync({
        chatId,
        excluded: true,
        reason: reasonDraft.trim() || undefined,
      });
      setQuery("");
      setResults([]);
      cancelReason();
      setFeedback({ kind: "success", message: `${name || "Customer"} added to the blacklist` });
    } catch (e) {
      setFeedback({
        kind: "error",
        message: e instanceof Error ? e.message : "Couldn't update the blacklist",
      });
    }
  }

  async function handleRemove(chatId: string, name: string | null) {
    try {
      await setExcluded.mutateAsync({ chatId, excluded: false });
      setFeedback({ kind: "success", message: `${name || "Customer"} removed from the blacklist` });
    } catch (e) {
      setFeedback({
        kind: "error",
        message: e instanceof Error ? e.message : "Couldn't update the blacklist",
      });
    }
  }

  function ReasonEditor({ onConfirm, confirmLabel }: { onConfirm: () => void; confirmLabel: string }) {
    return (
      <div className="flex items-start gap-2 bg-black/5 px-4 pb-3 pt-1 dark:bg-white/5">
        <input
          autoFocus
          value={reasonDraft}
          onChange={(e) => setReasonDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onConfirm();
            if (e.key === "Escape") cancelReason();
          }}
          placeholder="Why is this customer blacklisted? (optional)"
          className={`${INPUT_CLS} h-8 flex-1`}
        />
        <button
          type="button"
          disabled={setExcluded.isPending}
          onClick={onConfirm}
          className="h-8 shrink-0 rounded-md bg-[#7C3AED] px-3 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {confirmLabel}
        </button>
        <button type="button" onClick={cancelReason} className="h-8 shrink-0 px-2 text-xs text-foreground/60">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {feedback ? <StatusBanner kind={feedback.kind} message={feedback.message} /> : null}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-foreground/40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search customers by name, username, or phone…"
          className="h-9 w-full rounded-lg bg-black/5 pl-9 pr-3 text-[13px] text-foreground outline-none focus:ring-2 focus:ring-[#7C3AED]/30 dark:bg-white/10"
        />
        {searching ? (
          <ArrowRotateRight className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-foreground/40" />
        ) : null}
      </div>

      {query.trim() ? (
        <div className="divide-y divide-black/10 overflow-hidden rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/10">
          {results.length === 0 && !searching ? (
            <div className="px-4 py-3 text-xs text-foreground/50">No customers found</div>
          ) : null}
          {results.map((r) => {
            const already = blacklistedIds.has(r.id);
            const editingThis = reasonTargetId === r.id;
            return (
              <div key={r.id}>
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                    style={{ backgroundColor: pickAvatarColor(r.id, AGENTIC_AVATAR_PALETTE) }}
                  >
                    {initialsFor(r.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-foreground">{r.name}</span>
                    {(r.username || r.phone) && (
                      <span className="block truncate text-[11px] text-foreground/40">
                        {[r.username ? `@${r.username}` : null, r.phone].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    disabled={already || setExcluded.isPending}
                    onClick={() => (editingThis ? cancelReason() : (setReasonTargetId(r.id), setReasonDraft("")))}
                    className="h-7 shrink-0 rounded-md bg-black/5 px-3 text-xs font-medium text-foreground hover:bg-black/10 disabled:cursor-default disabled:opacity-50 dark:bg-white/10"
                  >
                    {already ? "Blocked" : "Blacklist"}
                  </button>
                </div>
                {editingThis ? (
                  <ReasonEditor onConfirm={() => void confirmBlacklist(r.id, r.name)} confirmLabel="Blacklist" />
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      <div>
        <h4 className="mb-2 text-[13px] font-semibold text-foreground">Blacklisted ({blacklist.length})</h4>

        {isLoading ? <div className="px-4 py-6 text-center text-xs text-foreground/50">Loading…</div> : null}

        {!isLoading && blacklist.length === 0 ? (
          <div className="rounded-xl border border-dashed border-black/10 px-4 py-8 text-center dark:border-white/10">
            <PersonXmark className="mx-auto mb-2 size-6 text-foreground/30" />
            <p className="text-xs text-foreground/50">No customers blacklisted yet. Search above to add one.</p>
          </div>
        ) : null}

        {!isLoading && blacklist.length > 0 ? (
          <div className="divide-y divide-black/10 overflow-hidden rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/10">
            {blacklist.map((b) => (
              <BlacklistRow
                key={b.chat_id}
                entry={b}
                editing={reasonTargetId === b.chat_id}
                reasonDraft={reasonDraft}
                onReasonDraftChange={setReasonDraft}
                onStartEdit={() => {
                  setReasonTargetId(b.chat_id);
                  setReasonDraft(b.reason || "");
                }}
                onCancelEdit={cancelReason}
                onConfirmEdit={() => void confirmBlacklist(b.chat_id, b.name)}
                onRemove={() => void handleRemove(b.chat_id, b.name)}
                pending={setExcluded.isPending}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function BlacklistRow({
  entry,
  editing,
  reasonDraft,
  onReasonDraftChange,
  onStartEdit,
  onCancelEdit,
  onConfirmEdit,
  onRemove,
  pending,
}: {
  entry: BlacklistedChat;
  editing: boolean;
  reasonDraft: string;
  onReasonDraftChange: (v: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onConfirmEdit: () => void;
  onRemove: () => void;
  pending: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-2.5">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
          style={{ backgroundColor: pickAvatarColor(entry.chat_id, AGENTIC_AVATAR_PALETTE) }}
        >
          {initialsFor(entry.name || "?")}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-foreground">
            {entry.name || "Unknown customer"}
            {!entry.found ? <span className="ml-2 text-[11px] text-foreground/40">(chat deleted)</span> : null}
          </span>
          {(entry.username || entry.phone) && (
            <span className="block truncate text-[11px] text-foreground/40">
              {[entry.username ? `@${entry.username}` : null, entry.phone].filter(Boolean).join(" · ")}
            </span>
          )}
          <button
            type="button"
            onClick={() => (editing ? onCancelEdit() : onStartEdit())}
            className="group mt-0.5 flex items-center gap-1 text-[11px] text-foreground/60 hover:text-foreground"
          >
            {entry.reason ? (
              <>
                <Ban className="size-3 shrink-0 text-foreground/40" />
                <span className="truncate italic">{entry.reason}</span>
              </>
            ) : (
              <span className="italic text-foreground/40 group-hover:text-foreground/60">Add a reason</span>
            )}
            <Pencil className="size-3 shrink-0 opacity-0 group-hover:opacity-100" />
          </button>
        </span>
        <button
          type="button"
          disabled={pending}
          onClick={onRemove}
          className="flex h-7 w-7 items-center justify-center rounded-md text-foreground/40 hover:bg-black/5 hover:text-foreground disabled:opacity-50 dark:hover:bg-white/10"
          title="Remove from blacklist"
        >
          <SquareXmark className="size-4" />
        </button>
      </div>
      {editing ? (
        <div className="flex items-start gap-2 bg-black/5 px-4 pb-3 pt-1 dark:bg-white/5">
          <input
            autoFocus
            value={reasonDraft}
            onChange={(e) => onReasonDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onConfirmEdit();
              if (e.key === "Escape") onCancelEdit();
            }}
            placeholder="Why is this customer blacklisted? (optional)"
            className={`${INPUT_CLS} h-8 flex-1`}
          />
          <button
            type="button"
            disabled={pending}
            onClick={onConfirmEdit}
            className="h-8 shrink-0 rounded-md bg-[#7C3AED] px-3 text-xs font-semibold text-white"
          >
            Save
          </button>
          <button type="button" onClick={onCancelEdit} className="h-8 shrink-0 px-2 text-xs text-foreground/60">
            Cancel
          </button>
        </div>
      ) : null}
    </div>
  );
}
