"use client";

import { useState } from "react";
import { ArrowRight, ArrowRotateLeft, ChevronDown, ChevronUp, Sparkles } from "@gravity-ui/icons";

import { useChatRecap, useRefreshChatRecap } from "@/features/messages/hooks/useAgentic";
import type { AgenticChannel } from "@/services/api/agentic";
import { AGENT_VIOLET } from "@/features/messages/components/agentic/constants";

export interface ChatRecapBannerProps {
  chatId: string;
  channel?: AgenticChannel;
}

export function ChatRecapBanner({ chatId, channel = "telegram" }: ChatRecapBannerProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { data, isLoading } = useChatRecap(chatId, true, channel);
  const refresh = useRefreshChatRecap(chatId, channel);

  if (isLoading && !data) {
    return (
      <div className="flex shrink-0 items-center gap-2 border-b px-5 py-2" style={{ backgroundColor: "rgba(124,58,237,0.04)" }}>
        <Sparkles className="size-3.5 animate-pulse" style={{ color: AGENT_VIOLET }} aria-hidden="true" />
        <span className="text-[12px] text-foreground/45">Preparing recap…</span>
      </div>
    );
  }
  if (!data?.available) return null;

  const toggle = () => {
    const sel = window.getSelection?.();
    if (sel && !sel.isCollapsed) return;
    setCollapsed((c) => !c);
  };

  return (
    <div role="button" tabIndex={0} onClick={toggle} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }} className="shrink-0 cursor-pointer border-b bg-[rgba(124,58,237,0.04)] hover:bg-[rgba(124,58,237,0.08)]">
      <div className="flex min-w-0 items-center gap-2 px-5 py-2">
        <Sparkles className="size-3.5 shrink-0" style={{ color: AGENT_VIOLET }} aria-hidden="true" />
        <span className="shrink-0 text-[11px] font-bold uppercase" style={{ color: AGENT_VIOLET }}>Recap</span>
        {data.headline ? <span className="min-w-0 truncate text-[12.5px] font-medium">{data.headline}</span> : null}
        {data.customer_waiting ? <span className="shrink-0 rounded-full bg-[#FEF3C7] px-1.5 py-0.5 text-[10.5px] font-semibold text-[#92400E]">Waiting</span> : null}
        <div className="flex-1" />
        <button type="button" onClick={(e) => { e.stopPropagation(); refresh.mutate(); }} disabled={refresh.isPending} className="rounded-md p-1 text-foreground/40 hover:bg-[var(--default)]" aria-label="Refresh">
          <ArrowRotateLeft className={`size-3.5 ${refresh.isPending ? "animate-spin" : ""}`} />
        </button>
        <span className="text-foreground/40">{collapsed ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}</span>
      </div>
      {!collapsed ? (
        <div className="px-5 pb-2.5">
          <p className="text-[12.5px] leading-relaxed text-foreground/70">{data.summary}</p>
          {data.next_step ? (
            <p className="mt-1 flex items-start gap-1.5 text-[12.5px] font-medium">
              <ArrowRight className="mt-[2px] size-3.5 shrink-0" style={{ color: AGENT_VIOLET }} aria-hidden="true" />
              <span><span style={{ color: AGENT_VIOLET }}>Next:</span> {data.next_step}</span>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
