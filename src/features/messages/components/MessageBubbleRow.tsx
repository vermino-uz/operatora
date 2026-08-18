"use client";

export interface MessageBubbleRowProps {
  content: string;
  direction: "inbound" | "outbound";
  timestamp?: string | null;
  status?: string | null;
}

/** Shared inbound/outbound text bubble for every Messages channel —
 * mirrors this codebase's own AI Chat `MessageBubble.tsx` bubble
 * conventions (rounded-2xl, accent fill for the "self" side) rather than
 * the old frontend's channel-specific bubble styling, per this feature's
 * "clean rebuild, not a visual port" brief. */
export function MessageBubbleRow({ content, direction, timestamp, status }: MessageBubbleRowProps) {
  const isOutbound = direction === "outbound";
  const time = timestamp
    ? new Date(timestamp).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div className={`flex px-4 py-1 ${isOutbound ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[70%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
          isOutbound ? "bg-accent text-accent-foreground" : "bg-[var(--default)] text-foreground"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{content}</p>
        <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${isOutbound ? "text-accent-foreground/70" : "text-foreground/40"}`}>
          <span>{time}</span>
          {isOutbound && status === "failed" ? <span className="text-danger">Failed</span> : null}
          {isOutbound && status === "pending" ? <span>Sending…</span> : null}
        </div>
      </div>
    </div>
  );
}
