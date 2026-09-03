/**
 * MERGE INTO: app/backend/src/billing/plan-features.catalog.ts
 *
 * Diff-style instructions (apply by hand or copy types into the existing file).
 */

/*
=== 1) Extend imports / add near top after existing AiChatModelOverride ===

import {
  AI_FEATURE_KEYS,
  AiFeatureKey,
  AiModelId,
  DEFAULT_AI_FEATURE_MODELS,
  creditLimitKey,
  type AiCreditLimitKey,
} from './ai-model-pricing.catalog';

=== 2) Extend NumericLimitKey ===

export type NumericLimitKey =
  | 'calls_per_month'
  | 'ai_chat_messages' // legacy invocation counter — prefer credits_ai_chat
  | 'ai_inbox_summaries' // legacy — prefer credits_ai_inbox_recap
  | 'ai_lead_assist' // legacy invocation — prefer credits_ai_lead_assist
  | 'ai_dashboards'
  | 'custom_dashboards'
  | 'image_generations'
  | 'max_operators'
  | 'storage_mb'
  | 'storage_retention_days'
  | AiCreditLimitKey;

=== 3) Extend PlanLimits interface with ===

  credits_ai_chat: number | null;
  credits_ai_transcript: number | null;
  credits_ai_conversation: number | null;
  credits_ai_agent_reply: number | null;
  credits_ai_agent_suggest: number | null;
  credits_ai_inbox_recap: number | null;
  credits_ai_agent_copilot: number | null;
  credits_ai_ranker: number | null;
  credits_ai_lead_distribution: number | null;
  credits_ai_lead_assist: number | null;
  credits_ai_custom_dashboard: number | null;
  credits_ai_ads_copilot: number | null;

=== 4) Extend PlanFeatureSet ===

  /** Fixed model per AI feature (plan-level). Replaces ai_chat_models allowlist for gating. */
  ai_feature_models: Partial<Record<AiFeatureKey, AiModelId>>;
  /** @deprecated Prefer ai_feature_models[ai_chat]. Kept for rollback. */
  ai_chat_models: AiChatModelOverride[];

=== 5) In each PLAN_FEATURE_SETS[tier].limits, add credit defaults
     (same numbers as migration 0175 / new UI DEFAULT_AI_CREDIT_LIMITS).

=== 6) In each PLAN_FEATURE_SETS[tier], add:
  ai_feature_models: { ...DEFAULT_AI_FEATURE_MODELS },

=== 7) Export helper ===

export function resolveAiFeatureModel(
  features: PlanFeatureSet,
  feature: AiFeatureKey,
): AiModelId {
  return features.ai_feature_models?.[feature] ?? DEFAULT_AI_FEATURE_MODELS[feature];
}
*/

export {};
