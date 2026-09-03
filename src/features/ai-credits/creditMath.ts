import {
  AI_MODEL_PRICING,
  CREDITS_PER_USD,
  type AiModelId,
} from "@/features/ai-credits/catalog";

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

/** USD cost for a single LLM call given model prices. */
export function costUsdForTokens(model: AiModelId, usage: TokenUsage): number {
  const price = AI_MODEL_PRICING[model];
  const input = Math.max(0, Number(usage.inputTokens) || 0);
  const output = Math.max(0, Number(usage.outputTokens) || 0);
  return (input / 1_000_000) * price.inputPer1M + (output / 1_000_000) * price.outputPer1M;
}

/**
 * Convert token usage → integer credits.
 * Minimum 1 credit when any tokens > 0 (even for free/local models with $0 price,
 * so unlimited-local still shows activity; local at $0 yields 1 credit floor).
 */
export function creditsForTokens(model: AiModelId, usage: TokenUsage): number {
  const input = Math.max(0, Number(usage.inputTokens) || 0);
  const output = Math.max(0, Number(usage.outputTokens) || 0);
  if (input + output <= 0) return 0;
  const usd = costUsdForTokens(model, { inputTokens: input, outputTokens: output });
  const raw = Math.ceil(usd * CREDITS_PER_USD);
  return Math.max(1, raw);
}

/**
 * Whether a workspace may start another call.
 * - limit === null → unlimited
 * - limit === 0 → feature off
 * - used >= limit → blocked (overshoot of a prior large call still blocks next)
 */
export function canStartAiCall(used: number, limit: number | null | undefined): boolean {
  if (limit === null || limit === undefined) return true;
  if (limit <= 0) return false;
  return used < limit;
}

export function remainingCredits(used: number, limit: number | null | undefined): number | null {
  if (limit === null || limit === undefined) return null;
  return Math.max(0, limit - Math.max(0, used));
}
