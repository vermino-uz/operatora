"use client";

import { useState, type ChangeEvent, type KeyboardEvent } from "react";
import { Button, Chip, Spinner } from "@heroui/react";
import { ArrowLeft, ArrowUp, Check, Sparkles, TrashBin, Xmark } from "@gravity-ui/icons";

import { ApiError } from "@/types/api";
import { useDeleteDashboardMutation, useEditDashboardMutation } from "@/features/dashboards/hooks/useDashboards";
import { DashboardWidgetCard } from "@/features/dashboards/components/DashboardWidgetCard";
import {
  CATEGORY_ACCENT,
  CATEGORY_LABELS,
  spanClass,
  type CustomDashboardRow,
  type DashboardChatMessage,
  type ResolvedDashboard,
} from "@/features/dashboards/types";

const FALLBACK_SUGGESTIONS = [
  "Switch to list view",
  "Only show the last 30 days",
  "Add a breakdown by channel",
  "Add a table of operators",
];

function seedChat(d: CustomDashboardRow): DashboardChatMessage[] {
  if (d.chat.length) return d.chat;
  if (d.prompt) return [{ role: "user", text: d.prompt, at: d.created_at }];
  return [];
}

/**
 * Selected dashboard's canvas + AI edit copilot (owner only) — reference:
 * old frontend's `components/dashboards/DashboardView.tsx`.
 */
export function DashboardView({
  dashboard,
  resolved,
  isOwner,
  onBack,
  onDeleted,
}: {
  dashboard: CustomDashboardRow;
  resolved: ResolvedDashboard;
  isOwner: boolean;
  onBack: () => void;
  onDeleted: () => void;
}) {
  const editMutation = useEditDashboardMutation(dashboard.id);
  const deleteMutation = useDeleteDashboardMutation();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<DashboardChatMessage[]>(() => seedChat(dashboard));
  const [suggestions, setSuggestions] = useState<string[]>(
    dashboard.suggestions.length ? dashboard.suggestions : FALLBACK_SUGGESTIONS,
  );
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [mobileCopilotOpen, setMobileCopilotOpen] = useState(false);

  const accent = CATEGORY_ACCENT[resolved.category] ?? CATEGORY_ACCENT.general;

  const submitEdit = (prompt: string, opts?: { keepDraft?: boolean }) => {
    const p = prompt.trim();
    if (!p || editMutation.isPending) return;
    if (!opts?.keepDraft) setInput("");
    setMessages((m) => [...m, { role: "user", text: p, at: new Date().toISOString() }]);
    editMutation.mutate(p, {
      onSuccess: (res) => {
        setMessages(res.dashboard.chat);
        if (res.suggestions?.length) setSuggestions(res.suggestions);
      },
      onError: () => {
        setMessages((m) => [
          ...m,
          { role: "assistant", text: "Couldn't apply that change — the dashboard was left untouched. Try again.", at: new Date().toISOString() },
        ]);
      },
    });
  };

  const handleDelete = () => {
    deleteMutation.mutate(dashboard.id, { onSuccess: onDeleted });
  };

  return (
    <div className="relative flex min-h-0 flex-1">
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1100px] px-3 py-4 sm:px-6 sm:py-5">
          <div className="mb-5 flex items-start gap-3">
            <Button variant="secondary" size="sm" isIconOnly onPress={onBack} aria-label="Back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-bold text-foreground">{resolved.title}</h1>
                <Chip size="sm" variant="soft">
                  <Chip.Label className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> {CATEGORY_LABELS[resolved.category]}
                  </Chip.Label>
                </Chip>
              </div>
              {resolved.description ? <p className="mt-1 text-sm text-foreground/60">{resolved.description}</p> : null}
            </div>
            {isOwner ? (
              deleteConfirming ? (
                <div className="flex shrink-0 items-center gap-2">
                  <Button variant="secondary" size="sm" onPress={() => setDeleteConfirming(false)}>
                    Cancel
                  </Button>
                  <Button variant="danger" size="sm" isDisabled={deleteMutation.isPending} onPress={handleDelete}>
                    {deleteMutation.isPending ? "Deleting…" : "Delete"}
                  </Button>
                </div>
              ) : (
                <Button variant="secondary" size="sm" isIconOnly onPress={() => setDeleteConfirming(true)} aria-label="Delete dashboard">
                  <TrashBin className="h-4 w-4" />
                </Button>
              )
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {resolved.widgets.map((w) => (
              <div key={w.id} className={spanClass(w.span)}>
                <DashboardWidgetCard widget={w} accent={accent} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {isOwner ? (
        <>
          {!mobileCopilotOpen ? (
            <button
              type="button"
              onClick={() => setMobileCopilotOpen(true)}
              className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-40 flex size-12 items-center justify-center rounded-full text-white shadow-lg lg:hidden"
              style={{ backgroundColor: accent }}
              aria-label="Open AI editor"
            >
              <Sparkles className="h-5 w-5" />
            </button>
          ) : null}
          <aside
            className={`flex min-h-0 flex-col border-l border-black/[0.08] bg-background dark:border-white/[0.12] ${
              mobileCopilotOpen
                ? "fixed inset-0 z-50 w-full lg:static lg:inset-auto lg:z-auto lg:w-[340px] lg:shrink-0"
                : "hidden lg:flex lg:w-[340px] lg:shrink-0"
            }`}
          >
          <div className="flex h-[52px] shrink-0 items-center gap-2 border-b border-black/[0.08] px-4 dark:border-white/[0.12]">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${accent}1a` }}>
              <Sparkles className="h-3.5 w-3.5" style={{ color: accent }} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold leading-tight text-foreground">Operatora AI</div>
              <div className="text-[11px] text-foreground/40">Ask for changes in plain language</div>
            </div>
            <button
              type="button"
              onClick={() => setMobileCopilotOpen(false)}
              className="flex size-8 items-center justify-center rounded-full text-foreground/40 hover:bg-[var(--default)] lg:hidden"
              aria-label="Close AI editor"
            >
              <Xmark className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-foreground px-3 py-2 text-xs leading-relaxed text-background">
                    {m.text}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex justify-start">
                  <div className="max-w-[90%] whitespace-pre-wrap break-words rounded-2xl rounded-bl-md bg-black/[0.04] px-3 py-2 text-xs leading-relaxed text-foreground dark:bg-white/[0.06]">
                    <span className="inline-flex items-start gap-1.5">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
                      <span>{m.text}</span>
                    </span>
                  </div>
                </div>
              ),
            )}
            {editMutation.isPending ? (
              <div className="flex items-center gap-2 pl-1 text-[11px] text-foreground/40">
                <Spinner size="sm" aria-label="Applying" /> Applying…
              </div>
            ) : null}
            {editMutation.isError ? (
              <p role="alert" className="pl-1 text-[11px] text-danger">
                {editMutation.error instanceof ApiError ? editMutation.error.message : "Something went wrong."}
              </p>
            ) : null}
            {!editMutation.isPending && suggestions.length > 0 ? (
              <div className="space-y-1.5 pt-2">
                <div className="text-[11px] font-medium text-foreground/40">More edits</div>
                {suggestions.map((s, i) => (
                  <button
                    key={`${s}-${i}`}
                    type="button"
                    onClick={() => submitEdit(s, { keepDraft: true })}
                    className="w-full rounded-lg border border-black/[0.08] px-3 py-2 text-left text-[11.5px] text-foreground/60 transition-colors hover:border-foreground/30 hover:bg-black/[0.02] dark:border-white/[0.12] dark:hover:bg-white/[0.04]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="shrink-0 border-t border-black/[0.08] px-3 pb-3 pt-2.5 dark:border-white/[0.12]">
            <div className="flex items-end gap-2 rounded-2xl border border-black/[0.08] px-1.5 py-1.5 transition-colors focus-within:border-foreground/30 dark:border-white/[0.12]">
              <textarea
                value={input}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
                onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submitEdit(input);
                  }
                }}
                rows={1}
                placeholder="Ask for a change…"
                disabled={editMutation.isPending}
                className="max-h-[132px] min-w-0 flex-1 resize-none overflow-y-auto bg-transparent px-2.5 py-1.5 text-[13px] leading-5 text-foreground outline-none placeholder:text-foreground/40 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => submitEdit(input)}
                disabled={!input.trim() || editMutation.isPending}
                aria-label="Send"
                className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: accent }}
              >
                {editMutation.isPending ? <Spinner size="sm" aria-label="Sending" /> : <ArrowUp className="h-4 w-4" />}
              </button>
            </div>
            <div className="mt-1.5 px-2 text-[10.5px] text-foreground/40">Enter to send · Shift+Enter for a new line</div>
          </div>
        </aside>
        </>
      ) : null}
    </div>
  );
}
