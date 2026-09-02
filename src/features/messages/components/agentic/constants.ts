import type {
  AgenticHandoffRules,
  AgenticResponseDelayMode,
  AgentTone,
  PricingDisclosure,
} from "@/services/api/agentic";

export const HANDOFF_KEYS: (keyof AgenticHandoffRules)[] = [
  "customer_asks_human",
  "negative_sentiment",
  "payment_refund_contract",
  "contact_info_shared",
  "requests_callback",
  "low_confidence",
  "outside_working_hours",
];

export const HANDOFF_LABELS: Record<keyof AgenticHandoffRules, string> = {
  customer_asks_human: "Customer asks for a human",
  negative_sentiment: "Negative sentiment / complaint",
  payment_refund_contract: "Payment, refund or contract",
  contact_info_shared: "Customer leaves their full name + phone number",
  requests_callback: "Customer asks to be called / contacted",
  low_confidence: "Agent confidence is low",
  outside_working_hours: "Outside working hours (09:00–18:00)",
};

export const VOICE_PERCENT_OPTIONS = [0, 10, 30, 50, 70, 100] as const;
export const DEFAULT_VOICE_PERCENT = 30;

export const RESPONSE_DELAY_OPTIONS: { value: AgenticResponseDelayMode; label: string }[] = [
  { value: "instant", label: "Instant" },
  { value: "short", label: "2-3 min" },
  { value: "long", label: "5-10 min" },
];

export const LANG_OPTIONS = ["uz", "ru", "en"] as const;
export const LANG_LABELS: Record<string, string> = { uz: "Uzbek", ru: "Russian", en: "English" };

export const TONE_OPTIONS: AgentTone[] = ["friendly", "formal", "sales", "short"];
export const TONE_LABELS: Record<AgentTone, string> = {
  friendly: "Friendly",
  formal: "Formal",
  sales: "Sales-focused",
  short: "Short & direct",
};
export const TONE_DESCRIPTIONS: Record<AgentTone, string> = {
  friendly: "Warm and conversational",
  formal: "Polite and professional",
  sales: "Move toward a next step",
  short: "Brief answers only",
};

export const PRICING_DISCLOSURE_OPTIONS: PricingDisclosure[] = [
  "end_of_conversation",
  "on_request",
  "never",
];
export const PRICING_DISCLOSURE_LABELS: Record<PricingDisclosure, string> = {
  end_of_conversation: "Explain first, mention price at the end",
  on_request: "Mention price only if asked",
  never: "Never mention price",
};

export const PAYMENT_OPTIONS = ["cash", "card", "payme", "click", "transfer"] as const;
export const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  payme: "Payme",
  click: "Click",
  transfer: "Transfer",
};

export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
export const DAY_LABELS: Record<number, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

export const DEFAULT_HANDOFF: AgenticHandoffRules = {
  customer_asks_human: true,
  negative_sentiment: true,
  payment_refund_contract: true,
  contact_info_shared: true,
  requests_callback: true,
  low_confidence: true,
  outside_working_hours: false,
};

export const AGENT_VIOLET = "#7C3AED";

export const CONFIDENCE_COLORS: Record<"high" | "medium" | "low", string> = {
  high: "#059669",
  medium: "#D97706",
  low: "#DC2626",
};

export const INPUT_CLS =
  "w-full rounded-lg border border-black/10 bg-[var(--default)] px-3 py-2 text-[13px] text-foreground placeholder:text-foreground/40 outline-none focus:border-[#7C3AED] dark:border-white/10";
