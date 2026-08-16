"use client";

import { useState } from "react";
import { Button, Input } from "@heroui/react";
import { ArrowUp, Check, Copy, Sparkles } from "@gravity-ui/icons";

import { LoadingState } from "@/components/shared/LoadingState";
import { useLeadSignalsQuery } from "@/features/leads/hooks/useLeadSignalsQuery";
import { useLeadAiAssistChat } from "@/features/leads/hooks/useLeadAiAssistChat";
import { formatChannelList, formatSignalsUpdatedAt, intentLabel, LEAD_AI_ASSIST_SUGGESTIONS } from "@/features/leads/leadSignals";

/**
 * AI Assist panel (Phase 2c-11) — insights + next-best-action (both backed
 * by `GET /signals/lead/:leadId`'s real `lead_signals` row, a background
 * worker's actual computed output, not fabricated) plus an ask-AI chat
 * (`POST /fn/lead-ai-assist`, see `services/api/leadAiAssist.ts`'s header
 * comment for the traced contract). UI is a clean rebuild of the old
 * frontend's `LeadAIAssist.tsx` layout/fields — not its purple-gradient
 * styling — using this app's existing HeroUI/border-card conventions
 * (`LeadStatsTab` etc.), same content shape.
 */
export function LeadAiAssistTab({ leadId, leadName, isActive }: { leadId: string; leadName: string; isActive: boolean }) {
  const signalsQuery = useLeadSignalsQuery(leadId, isActive);
  const chat = useLeadAiAssistChat(leadId);
  const [prompt, setPrompt] = useState("");
  const [copied, setCopied] = useState(false);

  const signals = signalsQuery.data ?? null;
  const intent = intentLabel(signals?.buying_intent_score);
  const intentPct =
    signals?.buying_intent_score != null ? `${Math.round(signals.buying_intent_score * 100)}% likely to close` : "Score pending";
  const nextActionTitle = signals?.next_action_promised?.trim() || "No recommended action yet";
  const nextActionBody =
    signals?.last_summary_text?.trim() ||
    (signals ? `Active on: ${formatChannelList(signals.channels_used)}` : "Signals not computed yet for this lead.");
  const nextActionDraft = signals?.next_action_promised?.trim() || "";

  async function copyDraft() {
    if (!nextActionDraft) return;
    try {
      await navigator.clipboard.writeText(nextActionDraft);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can fail (permissions/insecure context) — not
      // worth a hard error for a low-stakes convenience action.
    }
  }

  function submit() {
    const text = prompt;
    setPrompt("");
    void chat.send(text);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Insights */}
      <section className="rounded-lg border border-primary/20 bg-primary/5 p-3">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5" aria-hidden="true" />
            AI Insights
          </p>
          <p className="text-xs text-foreground/50">
            {signalsQuery.isLoading ? "Loading…" : formatSignalsUpdatedAt(signals?.updated_at)}
          </p>
        </div>
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span>
            {intent.emoji} {intent.label}
          </span>
          <span className="text-foreground/30">·</span>
          <span className="text-success">{intentPct}</span>
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground/50">
          <span>{signals?.silence_days != null ? `${signals.silence_days}d since last contact` : "No activity data yet"}</span>
          {signals?.last_channel ? <span>Last channel: {signals.last_channel}</span> : null}
          {signals?.total_calls_count != null || signals?.total_messages_count != null ? (
            <span>
              {signals?.total_calls_count ?? 0} calls · {signals?.total_messages_count ?? 0} messages
            </span>
          ) : null}
        </p>
      </section>

      {/* Next best action */}
      <section className="rounded-lg border border-border p-3">
        <p className="mb-1.5 text-xs font-semibold text-foreground/50">NEXT BEST ACTION</p>
        <p className="text-sm font-semibold text-foreground">{nextActionTitle}</p>
        <p className="mt-1 text-xs text-foreground/60">{nextActionBody}</p>
        {nextActionDraft ? (
          <div className="mt-2 rounded-lg bg-[var(--default)] px-3 py-2 text-xs text-foreground/70">{nextActionDraft}</div>
        ) : null}
        <div className="mt-2">
          <Button size="sm" variant="secondary" isDisabled={!nextActionDraft} onPress={() => void copyDraft()}>
            {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
            {copied ? "Copied" : "Copy draft"}
          </Button>
        </div>
      </section>

      {/* Suggested prompts */}
      <section>
        <p className="mb-1.5 text-xs font-semibold text-foreground/50">TRY ASKING</p>
        <div className="flex flex-wrap gap-1.5">
          {LEAD_AI_ASSIST_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              disabled={chat.isSending}
              onClick={() => void chat.send(suggestion)}
              className="rounded-lg border border-black/[0.08] px-2.5 py-1.5 text-xs text-foreground/70 hover:bg-black/[0.03] disabled:opacity-50 dark:border-white/[0.12] dark:hover:bg-white/[0.05]"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </section>

      <div className="h-px bg-border" />

      {/* Chat */}
      <section className="flex flex-col gap-2.5">
        <p className="text-xs font-semibold text-foreground/50">CONVERSATION</p>
        {chat.messages.length === 0 && !chat.isSending ? (
          <p className="text-xs text-foreground/40">Ask AI anything about {leadName || "this lead"} — history, objections, next steps.</p>
        ) : null}
        {chat.messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-lg rounded-tr-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex justify-start">
              <div className="max-w-[85%] rounded-lg rounded-tl-sm bg-[var(--default)] px-3 py-2 text-sm text-foreground">
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            </div>
          ),
        )}
        {chat.isSending ? <LoadingState label="Thinking…" /> : null}
        {chat.error ? <p className="text-xs text-danger">Something went wrong asking AI. Please try again.</p> : null}
      </section>

      {/* Composer */}
      <form
        className="sticky bottom-0 flex items-center gap-2 border-t border-border bg-background pt-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Input
          aria-label="Ask AI"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask AI about this lead…"
          disabled={chat.isSending}
          className="flex-1"
        />
        <Button type="submit" variant="primary" isIconOnly isDisabled={!prompt.trim() || chat.isSending} aria-label="Send">
          <ArrowUp className="size-4" aria-hidden="true" />
        </Button>
      </form>
    </div>
  );
}
