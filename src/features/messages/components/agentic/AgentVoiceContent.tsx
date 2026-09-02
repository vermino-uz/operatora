"use client";

import { Play } from "@gravity-ui/icons";

function fmt(secs: number): string {
  const s = Math.max(0, Math.round(secs || 0));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

const BARS = [6, 10, 14, 9, 16, 12, 18, 8, 13, 17, 11, 15, 7, 14, 10, 16, 9, 12, 6, 13, 8, 15, 11, 17, 10];

/** Mock voice bubble body for AI-generated voice messages. */
export function AgentVoiceContent({ durationSec }: { durationSec?: number | null }) {
  return (
    <div className="flex w-[230px] items-center gap-2.5 py-0.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/20">
        <Play className="ml-0.5 size-4 text-white" aria-hidden="true" />
      </span>
      <span className="flex h-5 flex-1 items-center gap-[2px]">
        {BARS.map((h, i) => (
          <span key={i} className="w-[2px] rounded-full bg-white/70" style={{ height: `${h}px` }} />
        ))}
      </span>
      <span className="shrink-0 text-[11px] tabular-nums text-white/90">{fmt(durationSec ?? 0)}</span>
    </div>
  );
}
