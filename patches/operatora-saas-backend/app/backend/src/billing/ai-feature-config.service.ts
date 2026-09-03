/**
 * APPLY TO: Operatora-SaaS/operatora → app/backend/src/billing/ai-feature-config.service.ts
 *
 * Thin plan→model/credit-limit reader. AiCreditsService can delegate here or
 * keep getModel inline; register whichever the BillingModule prefers.
 */

import { Injectable } from '@nestjs/common';
import {
  AiFeatureKey,
  AiModelId,
  DEFAULT_AI_FEATURE_MODELS,
  creditLimitKey,
  providerModelName,
} from './ai-model-pricing.catalog';
import { PlanLimitsService } from './plan-limits.service';

@Injectable()
export class AiFeatureConfigService {
  constructor(private readonly planLimits: PlanLimitsService) {}

  async getModel(workspaceId: string, feature: AiFeatureKey): Promise<AiModelId> {
    const plan = await this.planLimits.getPlanFeaturesForWorkspace(workspaceId).catch(() => null);
    const fromPlan = plan?.features?.ai_feature_models?.[feature] as AiModelId | undefined;
    if (fromPlan) return fromPlan;
    return DEFAULT_AI_FEATURE_MODELS[feature];
  }

  async getProviderModel(workspaceId: string, feature: AiFeatureKey): Promise<string> {
    return providerModelName(await this.getModel(workspaceId, feature));
  }

  async getCreditLimit(workspaceId: string, feature: AiFeatureKey): Promise<number | null> {
    return this.planLimits.getNumericLimit(workspaceId, creditLimitKey(feature));
  }
}
