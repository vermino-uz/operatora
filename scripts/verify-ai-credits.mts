/**
 * Node-runnable verification for credit math (no vitest in this package).
 * Run: `node --import tsx scripts/verify-ai-credits.mts` or via `npx tsx`.
 */
import assert from "node:assert/strict";

import { CREDITS_PER_USD } from "../src/features/ai-credits/catalog";
import {
  canStartAiCall,
  costUsdForTokens,
  creditsForTokens,
  remainingCredits,
} from "../src/features/ai-credits/creditMath";

// Flash: 1M in + 1M out → 0.15 + 0.6 = 0.75 USD → 75_000 credits
assert.equal(costUsdForTokens("gemini-flash", { inputTokens: 1_000_000, outputTokens: 1_000_000 }), 0.75);
assert.equal(creditsForTokens("gemini-flash", { inputTokens: 1_000_000, outputTokens: 1_000_000 }), 75_000);

// Tiny call floors to 1 credit
assert.equal(creditsForTokens("gemini-flash", { inputTokens: 1, outputTokens: 0 }), 1);

// Zero tokens → 0
assert.equal(creditsForTokens("gemini-flash", { inputTokens: 0, outputTokens: 0 }), 0);

// Local $0 still floors to 1 when tokens present
assert.equal(creditsForTokens("local", { inputTokens: 100, outputTokens: 50 }), 1);

assert.equal(CREDITS_PER_USD, 100_000);

assert.equal(canStartAiCall(0, null), true);
assert.equal(canStartAiCall(0, 0), false);
assert.equal(canStartAiCall(100, 100), false);
assert.equal(canStartAiCall(99, 100), true);
assert.equal(remainingCredits(40, 100), 60);
assert.equal(remainingCredits(10, null), null);

console.log("ai-credits math OK");
