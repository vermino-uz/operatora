"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Modal } from "@heroui/react";
import { Check, Magnifier as Search } from "@gravity-ui/icons";

import { initialsFor } from "@/features/messages/types";
import { pickAvatarColor } from "@/features/messages/lib/telegramSender";
import type { AgenticTargeting, AgenticChannel } from "@/services/api/agentic";
import { AGENTIC_AVATAR_PALETTE, type AgenticChatLite } from "@/features/messages/components/agentic/types";

const SEGMENT_KEYS: AgenticTargeting[] = ["new_only", "everyone", "selected"];

export interface AgenticTargetingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  chats: AgenticChatLite[];
  channel?: AgenticChannel;
  initialMode: AgenticTargeting;
  initialSelected: string[];
  onApply: (mode: AgenticTargeting, ids: string[]) => void;
}

export function AgenticTargetingDialog({
  isOpen,
  onClose,
  chats,
  channel = "telegram",
  initialMode,
  initialSelected,
  onApply,
}: AgenticTargetingDialogProps) {
  const isInstagram = channel === "instagram";
  const [mode, setMode] = useState<AgenticTargeting>(initialMode);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(Array.isArray(initialSelected) ? initialSelected : []),
  );
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setMode(initialMode);
    setSelected(new Set(Array.isArray(initialSelected) ? initialSelected : []));
    setQuery("");
  }, [isOpen, initialMode, initialSelected]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.preview || "").toLowerCase().includes(q),
    );
  }, [chats, query]);

  const isSelectable = mode === "selected";
  const scopeLabel =
    mode === "selected" ? "the selected set" : mode === "everyone" ? "every chat" : "new conversations";

  function segmentLabel(key: AgenticTargeting) {
    if (key === "new_only") return "New only";
    if (key === "everyone") return "Everyone";
    return "Selected";
  }

  function toggle(id: string) {
    if (!isSelectable) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Modal.Backdrop>
        <Modal.Container size="lg" className="max-w-[600px]">
          <Modal.Dialog className="max-h-[85vh] overflow-hidden p-0">
            <Modal.Header className="border-b border-black/10 px-6 pb-4 pt-5 dark:border-white/10">
              <Modal.Heading>Choose chats for the agent</Modal.Heading>
              <p className="text-sm text-foreground/60">
                {isInstagram ? "Instagram" : "Telegram"} · these conversations will be handled in {scopeLabel}
              </p>
            </Modal.Header>

            <div className="space-y-3 border-b border-black/10 px-6 py-4 dark:border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-xs text-foreground/60">Show:</span>
                <div className="flex items-center gap-1">
                  {SEGMENT_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setMode(key)}
                      className={`h-7 rounded-md px-3 text-xs font-medium transition-colors ${
                        mode === key ? "bg-[#7C3AED] text-white" : "bg-black/5 text-foreground/70 dark:bg-white/10"
                      }`}
                    >
                      {segmentLabel(key)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-foreground/40" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search conversations…"
                  className="h-9 w-full rounded-lg bg-black/5 pl-9 pr-3 text-[13px] text-foreground outline-none focus:ring-2 focus:ring-[#7C3AED]/30 dark:bg-white/10"
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground/60">
                  {chats.length} conversations
                  {isSelectable ? (
                    <>
                      {" · "}
                      <span className="font-semibold text-[#7C3AED]">{selected.size} selected</span>
                    </>
                  ) : null}
                </span>
                {isSelectable ? (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSelected(new Set(filtered.map((c) => c.id)))}
                      className="font-semibold text-[#7C3AED] hover:opacity-80"
                    >
                      Select all
                    </button>
                    <button type="button" onClick={() => setSelected(new Set())} className="text-foreground/60">
                      Clear
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <Modal.Body className="max-h-[46vh] overflow-y-auto p-0">
              {!isSelectable ? (
                <div className="bg-black/5 px-6 py-3 text-xs text-foreground/50 dark:bg-white/5">
                  {mode === "everyone"
                    ? "The agent will handle every incoming chat on this channel."
                    : "The agent will handle chats with no previous operator reply."}
                </div>
              ) : null}
              {filtered.map((c) => {
                const checked = selected.has(c.id);
                const color = c.avatarColor || pickAvatarColor(c.id, AGENTIC_AVATAR_PALETTE);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggle(c.id)}
                    disabled={!isSelectable}
                    className={`flex w-full items-center gap-3 px-6 py-2.5 text-left transition-colors disabled:cursor-default ${
                      checked ? "bg-[#7C3AED]/5" : "hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                  >
                    <span
                      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-2 ${
                        checked
                          ? "border-[#7C3AED] bg-[#7C3AED]"
                          : isSelectable
                            ? "border-black/20 bg-[var(--default)] dark:border-white/20"
                            : "border-black/10 bg-[var(--default)] dark:border-white/10"
                      }`}
                    >
                      {checked ? <Check className="size-3 text-white" /> : null}
                    </span>
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                      style={{ backgroundColor: color }}
                    >
                      {initialsFor(c.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-foreground">{c.name}</span>
                      <span className="block truncate text-xs text-foreground/60">{c.preview || ""}</span>
                    </span>
                    {c.time ? <span className="shrink-0 text-[11px] text-foreground/40">{c.time}</span> : null}
                  </button>
                );
              })}
              {filtered.length === 0 ? (
                <div className="px-6 py-8 text-center text-[13px] text-foreground/40">No conversations found.</div>
              ) : null}
            </Modal.Body>

            <Modal.Footer className="flex items-center justify-between gap-3 border-t border-black/10 px-6 py-4 dark:border-white/10">
              <span className="truncate text-xs text-foreground/50">
                Only these chats get agent replies — all others stay fully manual.
              </span>
              <div className="flex shrink-0 items-center gap-2">
                <Button variant="secondary" onPress={onClose}>
                  Cancel
                </Button>
                <Button
                  onPress={() => {
                    onApply(mode, isSelectable ? Array.from(selected) : []);
                    onClose();
                  }}
                >
                  {isSelectable ? `Apply (${selected.size})` : "Apply"}
                </Button>
              </div>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
