/**
 * Canonical AI feature + model catalogs for per-plan credit budgets and
 * fixed model selection. Wire keys must stay stable — they are shared with
 * the NestJS billing layer (`billing_plans.limits` / `features.ai_feature_models`).
 *
 * Credit scale: 1 credit = $0.00001 USD (CREDITS_PER_USD = 100_000).
 */

export const CREDITS_PER_USD = 100_000;

/** One unit of plan metering / model config. */
export const AI_FEATURE_KEYS = [
  "ai_chat",
  "ai_transcript",
  "ai_conversation",
  "ai_agent_reply",
  "ai_agent_suggest",
  "ai_inbox_recap",
  "ai_agent_copilot",
  "ai_ranker",
  "ai_lead_distribution",
  "ai_lead_assist",
  "ai_custom_dashboard",
  "ai_ads_copilot",
] as const;

export type AiFeatureKey = (typeof AI_FEATURE_KEYS)[number];

/** Limit keys stored on `billing_plans.limits` (credits_* prefix). */
export type AiCreditLimitKey = `credits_${AiFeatureKey}`;

export function creditLimitKey(feature: AiFeatureKey): AiCreditLimitKey {
  return `credits_${feature}`;
}

export const AI_FEATURE_LABELS: Record<AiFeatureKey, string> = {
  ai_chat: "AI chat",
  ai_transcript: "Transcript",
  ai_conversation: "Copilot conversation",
  ai_agent_reply: "Agent reply",
  ai_agent_suggest: "Agent suggest",
  ai_inbox_recap: "Inbox recap",
  ai_agent_copilot: "Agent copilot",
  ai_ranker: "AI ranker",
  ai_lead_distribution: "Lead distribution",
  ai_lead_assist: "Helper (lead assist)",
  ai_custom_dashboard: "Stat dashboard",
  ai_ads_copilot: "Ads copilot",
};

/** Canonical model ids used in admin dropdowns and LLM routing. */
export const AI_MODEL_IDS = [
  "gemini-flash",
  "gemini-pro",
  "claude-sonnet",
  "claude-opus",
  "openai-mini",
  "openai-nano",
  "local",
] as const;

export type AiModelId = (typeof AI_MODEL_IDS)[number];

export const AI_MODEL_LABELS: Record<AiModelId, string> = {
  "gemini-flash": "Gemini Flash",
  "gemini-pro": "Gemini Pro",
  "claude-sonnet": "Claude Sonnet",
  "claude-opus": "Claude Opus",
  "openai-mini": "OpenAI Mini",
  "openai-nano": "OpenAI Nano",
  local: "Local (Gemma)",
};

/** USD per 1M tokens — v1 code catalog (admin price editor is out of scope). */
export interface ModelTokenPrice {
  inputPer1M: number;
  outputPer1M: number;
}

export const AI_MODEL_PRICING: Record<AiModelId, ModelTokenPrice> = {
  "gemini-flash": { inputPer1M: 0.15, outputPer1M: 0.6 },
  "gemini-pro": { inputPer1M: 1.25, outputPer1M: 10 },
  "claude-sonnet": { inputPer1M: 3, outputPer1M: 15 },
  "claude-opus": { inputPer1M: 15, outputPer1M: 75 },
  "openai-mini": { inputPer1M: 0.15, outputPer1M: 0.6 },
  "openai-nano": { inputPer1M: 0.05, outputPer1M: 0.2 },
  local: { inputPer1M: 0, outputPer1M: 0 },
};

/** Default fixed model per feature when a plan has no override yet. */
export const DEFAULT_AI_FEATURE_MODELS: Record<AiFeatureKey, AiModelId> = {
  ai_chat: "gemini-flash",
  ai_transcript: "gemini-flash",
  ai_conversation: "gemini-flash",
  ai_agent_reply: "gemini-pro",
  ai_agent_suggest: "gemini-flash",
  ai_inbox_recap: "gemini-flash",
  ai_agent_copilot: "gemini-flash",
  ai_ranker: "local",
  ai_lead_distribution: "openai-mini",
  ai_lead_assist: "gemini-flash",
  ai_custom_dashboard: "gemini-flash",
  ai_ads_copilot: "gemini-flash",
};

/**
 * Default monthly credit budgets by tier.
 * Derived roughly from old invocation caps × ~200 credits/call avg for flash.
 * null = unlimited.
 */
export type PlanTier = "free" | "pro" | "max" | "corporate";

export const DEFAULT_AI_CREDIT_LIMITS: Record<
  PlanTier,
  Record<AiCreditLimitKey, number | null>
> = {
  free: {
    credits_ai_chat: 10_000,
    credits_ai_transcript: 20_000,
    credits_ai_conversation: 5_000,
    credits_ai_agent_reply: 0,
    credits_ai_agent_suggest: 5_000,
    credits_ai_inbox_recap: 5_000,
    credits_ai_agent_copilot: 0,
    credits_ai_ranker: 5_000,
    credits_ai_lead_distribution: 2_000,
    credits_ai_lead_assist: 5_000,
    credits_ai_custom_dashboard: 5_000,
    credits_ai_ads_copilot: 0,
  },
  pro: {
    credits_ai_chat: 50_000,
    credits_ai_transcript: 100_000,
    credits_ai_conversation: 25_000,
    credits_ai_agent_reply: 0,
    credits_ai_agent_suggest: 25_000,
    credits_ai_inbox_recap: 25_000,
    credits_ai_agent_copilot: 0,
    credits_ai_ranker: 25_000,
    credits_ai_lead_distribution: 10_000,
    credits_ai_lead_assist: 25_000,
    credits_ai_custom_dashboard: 25_000,
    credits_ai_ads_copilot: 25_000,
  },
  max: {
    credits_ai_chat: 500_000,
    credits_ai_transcript: 1_000_000,
    credits_ai_conversation: 250_000,
    credits_ai_agent_reply: 2_000_000,
    credits_ai_agent_suggest: 250_000,
    credits_ai_inbox_recap: 250_000,
    credits_ai_agent_copilot: 500_000,
    credits_ai_ranker: 250_000,
    credits_ai_lead_distribution: 100_000,
    credits_ai_lead_assist: 250_000,
    credits_ai_custom_dashboard: 250_000,
    credits_ai_ads_copilot: 250_000,
  },
  corporate: {
    credits_ai_chat: null,
    credits_ai_transcript: null,
    credits_ai_conversation: null,
    credits_ai_agent_reply: null,
    credits_ai_agent_suggest: null,
    credits_ai_inbox_recap: null,
    credits_ai_agent_copilot: null,
    credits_ai_ranker: null,
    credits_ai_lead_distribution: null,
    credits_ai_lead_assist: null,
    credits_ai_custom_dashboard: null,
    credits_ai_ads_copilot: null,
  },
};

/** Map legacy AI Chat allowlist ids → fixed model ids. */
export function legacyChatModelToAiModelId(
  legacy: "auto" | "claude-sonnet" | "claude-opus" | "gemini" | "local" | string,
): AiModelId {
  switch (legacy) {
    case "claude-sonnet":
      return "claude-sonnet";
    case "claude-opus":
      return "claude-opus";
    case "local":
      return "local";
    case "gemini":
    case "auto":
    default:
      return "gemini-flash";
  }
}
