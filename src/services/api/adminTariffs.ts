import { apiFetch } from "@/services/api/client";
import {
  AI_FEATURE_KEYS,
  AI_MODEL_IDS,
  DEFAULT_AI_CREDIT_LIMITS,
  DEFAULT_AI_FEATURE_MODELS,
  creditLimitKey,
  type AiCreditLimitKey,
  type AiFeatureKey,
  type AiModelId,
  type PlanTier,
} from "@/features/ai-credits/catalog";

export type MessageChannel = "telegram" | "sms" | "instagram" | "whatsapp";

export interface AdminPlanLimits {
  calls_per_month: number | null;
  ai_chat_messages: number | null;
  ai_inbox_summaries: number | null;
  ai_lead_assist: number | null;
  ai_dashboards: number | null;
  custom_dashboards: number | null;
  image_generations: number | null;
  max_operators: number | null;
  storage_mb: number | null;
  storage_retention_days: number | null;
  credits_ai_chat?: number | null;
  credits_ai_transcript?: number | null;
  credits_ai_conversation?: number | null;
  credits_ai_agent_reply?: number | null;
  credits_ai_agent_suggest?: number | null;
  credits_ai_inbox_recap?: number | null;
  credits_ai_agent_copilot?: number | null;
  credits_ai_ranker?: number | null;
  credits_ai_lead_distribution?: number | null;
  credits_ai_lead_assist?: number | null;
  credits_ai_custom_dashboard?: number | null;
  credits_ai_ads_copilot?: number | null;
}

export interface AdminPlanFeatures {
  channels: MessageChannel[];
  agentic_mode: boolean;
  /** @deprecated Prefer ai_feature_models. */
  ai_chat_models?: string[];
  ai_feature_models: Partial<Record<AiFeatureKey, AiModelId>>;
}

export interface TariffPlan {
  slug: PlanTier | string;
  name: string;
  limits: AdminPlanLimits;
  features: AdminPlanFeatures;
}

function ensureCreditLimits(limits: AdminPlanLimits, slug: string): AdminPlanLimits {
  const tier = (["free", "pro", "max", "corporate"].includes(slug) ? slug : "free") as PlanTier;
  const defaults = DEFAULT_AI_CREDIT_LIMITS[tier];
  const next: AdminPlanLimits = { ...limits };
  for (const feature of AI_FEATURE_KEYS) {
    const key = creditLimitKey(feature);
    if (next[key] === undefined) {
      next[key] = defaults[key];
    }
  }
  return next;
}

function ensureFeatureModels(features: Partial<AdminPlanFeatures> | undefined): AdminPlanFeatures {
  const models: Partial<Record<AiFeatureKey, AiModelId>> = {
    ...DEFAULT_AI_FEATURE_MODELS,
    ...(features?.ai_feature_models ?? {}),
  };
  for (const id of Object.values(models)) {
    if (id && !AI_MODEL_IDS.includes(id as AiModelId)) {
      // drop unknown
    }
  }
  return {
    channels: Array.isArray(features?.channels)
      ? (features!.channels as MessageChannel[])
      : ["telegram", "sms"],
    agentic_mode: Boolean(features?.agentic_mode),
    ai_chat_models: features?.ai_chat_models,
    ai_feature_models: models,
  };
}

function normalizePlan(raw: Record<string, unknown>): TariffPlan {
  const slug = String(raw.slug ?? "free");
  const limits = ensureCreditLimits((raw.limits ?? {}) as AdminPlanLimits, slug);
  const features = ensureFeatureModels(raw.features as Partial<AdminPlanFeatures> | undefined);
  return {
    slug,
    name: String(raw.name ?? slug),
    limits,
    features,
  };
}

export const adminTariffsApi = {
  async list(): Promise<TariffPlan[]> {
    const data = await apiFetch<unknown>("/admin/tariffs");
    const rows = Array.isArray(data)
      ? data
      : Array.isArray((data as { plans?: unknown }).plans)
        ? (data as { plans: unknown[] }).plans
        : Array.isArray((data as { rows?: unknown }).rows)
          ? (data as { rows: unknown[] }).rows
          : [];
    return rows.map((row) => normalizePlan(row as Record<string, unknown>));
  },

  async update(
    slug: string,
    body: { limits?: Partial<AdminPlanLimits>; features?: Partial<AdminPlanFeatures> },
  ): Promise<TariffPlan> {
    const data = await apiFetch<Record<string, unknown>>(
      `/admin/tariffs/${encodeURIComponent(slug)}`,
      { method: "PUT", body },
    );
    return normalizePlan(data);
  },
};

export type { AiCreditLimitKey, AiFeatureKey, AiModelId };
