/**
 * APPLY AS: app/backend/src/billing/ai-credits.math.spec.ts
 * (or nest beside ai-model-pricing.catalog.ts)
 */

import {
  CREDITS_PER_USD,
  costUsdForTokens,
  creditsForTokens,
} from './ai-model-pricing.catalog';

describe('AI credit math', () => {
  it('uses CREDITS_PER_USD = 100_000', () => {
    expect(CREDITS_PER_USD).toBe(100_000);
  });

  it('charges flash 1M in + 1M out as 75_000 credits', () => {
    expect(costUsdForTokens('gemini-flash', 1_000_000, 1_000_000)).toBe(0.75);
    expect(creditsForTokens('gemini-flash', 1_000_000, 1_000_000)).toBe(75_000);
  });

  it('floors tiny non-zero usage to 1 credit', () => {
    expect(creditsForTokens('gemini-flash', 1, 0)).toBe(1);
  });

  it('returns 0 for zero tokens', () => {
    expect(creditsForTokens('gemini-flash', 0, 0)).toBe(0);
  });

  it('floors local $0 models to 1 credit when tokens present', () => {
    expect(creditsForTokens('local', 100, 50)).toBe(1);
  });
});

/**
 * Gating semantics (assert in AiCreditsService / PlanLimitsService tests):
 * - limit null → allow
 * - limit 0 → feature off (403)
 * - used >= limit → 402 AI_CREDITS_EXHAUSTED
 * - overshoot after a large call is allowed for that completion; next call fails
 */
