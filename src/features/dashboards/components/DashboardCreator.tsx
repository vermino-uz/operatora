"use client";

import { useState, type ChangeEvent, type KeyboardEvent } from "react";
import { ArrowUp, Sparkles, ChartMixed, Persons, TriangleExclamation, LayoutColumns } from "@gravity-ui/icons";
import { Spinner } from "@heroui/react";

const CHIPS = ["Sales closed", "Operator stats", "Hot leads", "Conversion funnel"];

const STARTERS: { icon: typeof ChartMixed; title: string; prompt: string; tint: string }[] = [
  { icon: LayoutColumns, title: "Sales trend", prompt: "Show me sales closed per day over the last 30 days as a chart", tint: "#3b6ea5" },
  { icon: Persons, title: "Operator output", prompt: "Show call count and average score for each operator", tint: "#7C3AED" },
  { icon: TriangleExclamation, title: "Hot leads", prompt: "Show the inflow of new leads over the last 7 days", tint: "#c0392b" },
  { icon: ChartMixed, title: "By source", prompt: "Show the distribution of leads by channel (Telegram, Instagram, etc.)", tint: "#4b7a52" },
];

/** Prompt-first creation screen — reference: old frontend's `components/
 * dashboards/DashboardCreator.tsx`. */
export function DashboardCreator({
  generating,
  canCreate,
  onGenerate,
}: {
  generating: boolean;
  canCreate: boolean;
  onGenerate: (prompt: string) => void;
}) {
  const [prompt, setPrompt] = useState("");

  const submit = (p: string) => {
    const text = p.trim();
    if (!text || generating || !canCreate) return;
    onGenerate(text);
  };

  return (
    <div className="mx-auto max-w-[860px] px-6 py-12">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
          <Sparkles className="h-3.5 w-3.5" />
          AI-generated
        </span>
        <h1 className="mt-4 text-[34px] font-bold leading-tight text-foreground">What do you want to see?</h1>
        <p className="mx-auto mt-3 max-w-[560px] text-[15px] text-foreground/60">
          Describe the dashboard in plain language — it&apos;s built live from your workspace&apos;s real data.
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-black/[0.08] p-3 shadow-sm dark:border-white/[0.12]">
        <div className="flex items-start gap-2">
          <textarea
            value={prompt}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
            onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(prompt);
              }
            }}
            rows={2}
            disabled={generating || !canCreate}
            placeholder="e.g. Show sold leads per week for the last 3 months"
            className="flex-1 resize-none bg-transparent px-2 py-1.5 text-[15px] leading-6 text-foreground outline-none placeholder:text-foreground/40 disabled:opacity-60"
          />
          <button
            type="button"
            onClick={() => submit(prompt)}
            disabled={!prompt.trim() || generating || !canCreate}
            aria-label="Generate"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {generating ? <Spinner size="sm" aria-label="Generating" /> : <ArrowUp className="h-4 w-4" />}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 px-1 pt-2">
          {CHIPS.map((c, i) => (
            <button
              key={c}
              type="button"
              onClick={() => setPrompt(STARTERS[i]?.prompt ?? c)}
              disabled={generating || !canCreate}
              className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors disabled:opacity-50 ${
                i === 0 ? "bg-foreground text-background" : "bg-black/[0.04] text-foreground/60 hover:text-foreground dark:bg-white/[0.06]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {!canCreate ? (
        <p className="mt-4 text-center text-xs text-foreground/50">
          Only the workspace owner can create AI dashboards.
        </p>
      ) : null}

      <div className="mt-10">
        <div className="mb-3 text-sm font-semibold text-foreground">
          Start from an example <span className="font-normal text-foreground/40">· popular</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {STARTERS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.title}
                type="button"
                onClick={() => submit(s.prompt)}
                disabled={generating || !canCreate}
                className="rounded-2xl border border-black/[0.08] p-4 text-left transition-colors hover:border-foreground/30 disabled:opacity-50 dark:border-white/[0.12]"
              >
                <span
                  className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${s.tint}1a` }}
                >
                  <Icon className="h-[18px] w-[18px]" style={{ color: s.tint }} />
                </span>
                <div className="text-sm font-semibold text-foreground">{s.title}</div>
                <div className="mt-1 text-xs leading-relaxed text-foreground/60">&ldquo;{s.prompt}&rdquo;</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
