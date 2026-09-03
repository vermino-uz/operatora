/**
 * APPLY TO: Operatora-SaaS/operatora → app/backend/src/billing/ai-credits.service.ts
 *
 * Token/cost-weighted credit gating + consumption for AI features.
 */

import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  AI_FEATURE_KEYS,
  AiFeatureKey,
  AiModelId,
  DEFAULT_AI_FEATURE_MODELS,
  costUsdForTokens,
  creditLimitKey,
  creditsForTokens,
  providerModelName,
} from './ai-model-pricing.catalog';
import { PlanLimitsService } from './plan-limits.service';
import { AiUsageService } from './ai-usage.service';

@Injectable()
export class AiCreditsService {
  private readonly logger = new Logger(AiCreditsService.name);

  constructor(
    private readonly planLimits: PlanLimitsService,
    private readonly aiUsage: AiUsageService,
  ) {}

  async getModel(workspaceId: string, feature: AiFeatureKey): Promise<AiModelId> {
    const plan = await this.planLimits.getPlanFeaturesForWorkspace(workspaceId).catch(() => null);
    const fromPlan = plan?.features?.ai_feature_models?.[feature] as AiModelId | undefined;
    if (fromPlan) return fromPlan;
    return DEFAULT_AI_FEATURE_MODELS[feature];
  }

  async getProviderModel(workspaceId: string, feature: AiFeatureKey): Promise<string> {
    return providerModelName(await this.getModel(workspaceId, feature));
  }

  /**
   * Reject when period usage already meets/exceeds credit budget.
   * null limit = unlimited; 0 = feature off.
   */
  async assertCreditsRemaining(workspaceId: string, feature: AiFeatureKey): Promise<void> {
    const key = creditLimitKey(feature);
    const limit = await this.planLimits.getNumericLimit(workspaceId, key);
    if (limit === null) return;
    if (limit <= 0) {
      throw new ForbiddenException({
        code: 'AI_FEATURE_DISABLED',
        message: `AI feature ${feature} is not included in your plan`,
        feature,
      });
    }
    const used = await this.planLimits.getUsageCount(workspaceId, key);
    if (used >= limit) {
      throw new HttpException(
        {
          code: 'AI_CREDITS_EXHAUSTED',
          message: `Monthly AI credits exhausted for ${feature}`,
          feature,
          used,
          limit,
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
  }

  async consumeCredits(
    workspaceId: string,
    feature: AiFeatureKey,
    opts: {
      model: AiModelId;
      inputTokens?: number;
      outputTokens?: number;
      userId?: string;
    },
  ): Promise<{ credits: number; costUsd: number }> {
    const inputTokens = opts.inputTokens ?? 0;
    const outputTokens = opts.outputTokens ?? 0;
    const credits = creditsForTokens(opts.model, inputTokens, outputTokens);
    const costUsd = costUsdForTokens(opts.model, inputTokens, outputTokens);
    if (credits > 0) {
      await this.planLimits.incrementUsage(workspaceId, creditLimitKey(feature) as any, credits);
    }
    await this.aiUsage.record({
      workspaceId,
      feature,
      model: opts.model,
      inputTokens,
      outputTokens,
      costUsd,
      userId: opts.userId,
      countUsage: false,
    });
    return { credits, costUsd };
  }

  /** Remaining credits map for GET /billing/me. */
  async remainingForWorkspace(workspaceId: string): Promise<
    Record<string, { used: number; limit: number | null; remaining: number | null }>
  > {
    const out: Record<string, { used: number; limit: number | null; remaining: number | null }> = {};
    for (const feature of AI_FEATURE_KEYS) {
      const key = creditLimitKey(feature);
      const limit = await this.planLimits.getNumericLimit(workspaceId, key);
      const used = await this.planLimits.getUsageCount(workspaceId, key);
      out[key] = {
        used,
        limit,
        remaining: limit === null ? null : Math.max(0, limit - used),
      };
    }
    return out;
  }
}
