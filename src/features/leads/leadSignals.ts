import type { LeadSignalsRow } from "@/services/api/leadAiAssist";

export type { LeadSignalsRow };

/** Same score bands as the old frontend's `lib/leadSignalsDisplay.ts`
 * (`intentLabel`) — read for reference only, ported here since the
 * thresholds are a display convention, not something the backend exposes as
 * an enum. */
export function intentLabel(score: number | null | undefined): { emoji: string; label: string } {
  if (score == null || Number.isNaN(score)) {
    return { emoji: "❄️", label: "No score yet" };
  }
  if (score >= 0.75) return { emoji: "🔥", label: "Hot lead" };
  if (score >= 0.5) return { emoji: "🌡", label: "Warm lead" };
  if (score >= 0.25) return { emoji: "🧊", label: "Cool lead" };
  return { emoji: "❄️", label: "Cold lead" };
}

export function formatSignalsUpdatedAt(iso?: string | null): string {
  if (!iso) return "Not computed yet";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Updated just now";
  if (mins < 60) return `Updated ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `Updated ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Updated ${days}d ago`;
}

export function formatChannelList(channels?: string[] | null): string {
  if (!Array.isArray(channels) || channels.length === 0) return "No channels yet";
  return channels.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(", ");
}

/** Fixed set of suggested prompts for the AI Assist chat — mirrors the old
 * frontend's `LeadAIAssist.tsx` suggestion chips (summarize/objections/
 * draft message/follow-up timing), rewritten in plain English since this
 * app has no lead-feature i18n layer. */
export const LEAD_AI_ASSIST_SUGGESTIONS = [
  "Summarize this lead's history",
  "What objections have come up?",
  "Draft a follow-up message",
  "When should I follow up next?",
] as const;
