/**
 * REPLACE / MERGE INTO: app/admin/src/hooks/useTariffs.ts
 * Adds credit limit keys + ai_feature_models to the tariff draft contract.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminFetch } from '../lib/adminFetch';

export type MessageChannel = 'telegram' | 'sms' | 'instagram' | 'whatsapp';

export type AiFeatureKey =
  | 'ai_chat'
  | 'ai_transcript'
  | 'ai_conversation'
  | 'ai_agent_reply'
  | 'ai_agent_suggest'
  | 'ai_inbox_recap'
  | 'ai_agent_copilot'
  | 'ai_ranker'
  | 'ai_lead_distribution'
  | 'ai_lead_assist'
  | 'ai_custom_dashboard'
  | 'ai_ads_copilot';

export type AiModelId =
  | 'gemini-flash'
  | 'gemini-pro'
  | 'claude-sonnet'
  | 'claude-opus'
  | 'openai-mini'
  | 'openai-nano'
  | 'local';

export const AI_FEATURE_KEYS: AiFeatureKey[] = [
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
];

export const AI_FEATURE_LABELS: Record<AiFeatureKey, string> = {
  ai_chat: 'AI chat',
  ai_transcript: 'Transcript',
  ai_conversation: 'Copilot conversation',
  ai_agent_reply: 'Agent reply',
  ai_agent_suggest: 'Agent suggest',
  ai_inbox_recap: 'Inbox recap',
  ai_agent_copilot: 'Agent copilot',
  ai_ranker: 'AI ranker',
  ai_lead_distribution: 'Lead distribution',
  ai_lead_assist: 'Helper (lead assist)',
  ai_custom_dashboard: 'Stat dashboard',
  ai_ads_copilot: 'Ads copilot',
};

export const AI_MODEL_IDS: AiModelId[] = [
  'gemini-flash',
  'gemini-pro',
  'claude-sonnet',
  'claude-opus',
  'openai-mini',
  'openai-nano',
  'local',
];

export const AI_MODEL_LABELS: Record<AiModelId, string> = {
  'gemini-flash': 'Gemini Flash',
  'gemini-pro': 'Gemini Pro',
  'claude-sonnet': 'Claude Sonnet',
  'claude-opus': 'Claude Opus',
  'openai-mini': 'OpenAI Mini',
  'openai-nano': 'OpenAI Nano',
  local: 'Local (Gemma)',
};

export type AiCreditLimitKey = `credits_${AiFeatureKey}`;

export function creditLimitKey(feature: AiFeatureKey): AiCreditLimitKey {
  return `credits_${feature}`;
}

/** null = unlimited on every numeric limit. */
export interface PlanLimits {
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
}

export interface PlanFeatures {
  channels: MessageChannel[];
  agentic_mode: boolean;
  /** @deprecated Prefer ai_feature_models */
  ai_chat_models?: string[];
  ai_feature_models: Partial<Record<AiFeatureKey, AiModelId>>;
}

export interface TariffPlan {
  slug: string;
  name: string;
  limits: PlanLimits;
  features: PlanFeatures;
}

export interface UpdatePlanPayload {
  limits?: Partial<PlanLimits>;
  features?: Partial<PlanFeatures>;
}

export const SEAT_LIMIT_KEYS: Array<keyof PlanLimits> = [
  'calls_per_month',
  'ai_dashboards',
  'custom_dashboards',
  'image_generations',
  'max_operators',
  'storage_mb',
  'storage_retention_days',
];

export const SEAT_LIMIT_LABELS: Partial<Record<keyof PlanLimits, string>> = {
  calls_per_month: "Qo'ng'iroqlar / oy (upload)",
  ai_dashboards: 'AI chat threadlar',
  custom_dashboards: 'Custom dashboardlar',
  image_generations: 'Rasm generatsiyalari',
  max_operators: 'Operatorlar',
  storage_mb: 'Storage (MB)',
  storage_retention_days: 'Storage retention (kun)',
};

export function useTariffs() {
  return useQuery({
    queryKey: ['admin', 'tariffs'],
    queryFn: async () => {
      const data = await adminFetch<TariffPlan[] | { plans: TariffPlan[] }>('/admin/tariffs');
      return Array.isArray(data) ? data : data.plans ?? [];
    },
  });
}

export function useUpdateTariff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { slug: string } & UpdatePlanPayload) => {
      const { slug, ...body } = params;
      return adminFetch<TariffPlan>(`/admin/tariffs/${encodeURIComponent(slug)}`, {
        method: 'PUT',
        body,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'tariffs'] }),
  });
}
