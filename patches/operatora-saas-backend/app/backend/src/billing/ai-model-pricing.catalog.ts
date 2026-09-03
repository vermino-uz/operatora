/**
 * APPLY TO: Operatora-SaaS/operatora → app/backend/src/billing/
 *
 * Canonical AI feature keys, model ids, pricing, and credit scale.
 * Keep in sync with new UI `src/features/ai-credits/catalog.ts`.
 */

export const CREDITS_PER_USD = 100_000;

export const AI_FEATURE_KEYS = [
  'ai_chat',
  'ai_transcript',
  'ai_conversation',
  'ai_agent_reply',
  'ai_agent_suggest',
  'ai_inbox_recap',
  'ai_agent_copilot',
  'ai_ranker',
  'ai_lead_distribution',
  'ai_lead_assist',
  'ai_custom_dashboard',
  'ai_ads_copilot',
] as const;

export type AiFeatureKey = (typeof AI_FEATURE_KEYS)[number];
export type AiCreditLimitKey = `credits_${AiFeatureKey}`;

export function creditLimitKey(feature: AiFeatureKey): AiCreditLimitKey {
  return `credits_${feature}`;
}

export const AI_MODEL_IDS = [
  'gemini-flash',
  'gemini-pro',
  'claude-sonnet',
  'claude-opus',
  'openai-mini',
  'openai-nano',
  'local',
] as const;

export type AiModelId = (typeof AI_MODEL_IDS)[number];

export interface ModelTokenPrice {
  inputPer1M: number;
  outputPer1M: number;
  /** Provider API model string when different from AiModelId. */
  providerModel?: string;
}

export const AI_MODEL_PRICING: Record<AiModelId, ModelTokenPrice> = {
  'gemini-flash': { inputPer1M: 0.15, outputPer1M: 0.6, providerModel: 'gemini-3-flash-preview' },
  'gemini-pro': { inputPer1M: 1.25, outputPer1M: 10, providerModel: 'gemini-3.1-pro-preview' },
  'claude-sonnet': { inputPer1M: 3, outputPer1M: 15 },
  'claude-opus': { inputPer1M: 15, outputPer1M: 75 },
  'openai-mini': { inputPer1M: 0.15, outputPer1M: 0.6, providerModel: 'gpt-5.4-mini' },
  'openai-nano': { inputPer1M: 0.05, outputPer1M: 0.2, providerModel: 'gpt-5.4-nano' },
  local: { inputPer1M: 0, outputPer1M: 0 },
};

export const DEFAULT_AI_FEATURE_MODELS: Record<AiFeatureKey, AiModelId> = {
  ai_chat: 'gemini-flash',
  ai_transcript: 'gemini-flash',
  ai_conversation: 'gemini-flash',
  ai_agent_reply: 'gemini-pro',
  ai_agent_suggest: 'gemini-flash',
  ai_inbox_recap: 'gemini-flash',
  ai_agent_copilot: 'gemini-flash',
  ai_ranker: 'local',
  ai_lead_distribution: 'openai-mini',
  ai_lead_assist: 'gemini-flash',
  ai_custom_dashboard: 'gemini-flash',
  ai_ads_copilot: 'gemini-flash',
};

export function costUsdForTokens(
  model: AiModelId,
  inputTokens: number,
  outputTokens: number,
): number {
  const price = AI_MODEL_PRICING[model];
  const input = Math.max(0, Number(inputTokens) || 0);
  const output = Math.max(0, Number(outputTokens) || 0);
  return (input / 1_000_000) * price.inputPer1M + (output / 1_000_000) * price.outputPer1M;
}

export function creditsForTokens(
  model: AiModelId,
  inputTokens: number,
  outputTokens: number,
): number {
  const input = Math.max(0, Number(inputTokens) || 0);
  const output = Math.max(0, Number(outputTokens) || 0);
  if (input + output <= 0) return 0;
  const usd = costUsdForTokens(model, input, output);
  return Math.max(1, Math.ceil(usd * CREDITS_PER_USD));
}

export function providerModelName(model: AiModelId): string {
  return AI_MODEL_PRICING[model].providerModel ?? model;
}
