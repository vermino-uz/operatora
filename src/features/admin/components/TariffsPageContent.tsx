"use client";

import { useEffect, useState } from "react";
import { Button, Input } from "@heroui/react";

import {
  AI_FEATURE_KEYS,
  AI_FEATURE_LABELS,
  AI_MODEL_IDS,
  AI_MODEL_LABELS,
  creditLimitKey,
  type AiFeatureKey,
  type AiModelId,
} from "@/features/ai-credits/catalog";
import { useTariffsQuery, useUpdateTariffMutation } from "@/features/admin/hooks/useTariffs";
import type { AdminPlanFeatures, AdminPlanLimits, TariffPlan } from "@/services/api/adminTariffs";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { ApiError } from "@/types/api";

const SEAT_LIMIT_KEYS: Array<keyof AdminPlanLimits> = [
  "calls_per_month",
  "ai_dashboards",
  "custom_dashboards",
  "image_generations",
  "max_operators",
  "storage_mb",
  "storage_retention_days",
];

const SEAT_LIMIT_LABELS: Partial<Record<keyof AdminPlanLimits, string>> = {
  calls_per_month: "Calls / month (uploads)",
  ai_dashboards: "AI chat threads (seats)",
  custom_dashboards: "Custom dashboards (seats)",
  image_generations: "Image generations / month",
  max_operators: "Operator seats",
  storage_mb: "Storage (MB)",
  storage_retention_days: "Storage retention (days)",
};

interface DraftState {
  limits: AdminPlanLimits;
  features: AdminPlanFeatures;
}

function cloneDraft(plan: TariffPlan): DraftState {
  return {
    limits: { ...plan.limits },
    features: {
      channels: [...plan.features.channels],
      agentic_mode: plan.features.agentic_mode,
      ai_chat_models: plan.features.ai_chat_models ? [...plan.features.ai_chat_models] : undefined,
      ai_feature_models: { ...plan.features.ai_feature_models },
    },
  };
}

function PlanCard({ plan }: { plan: TariffPlan }) {
  const updateM = useUpdateTariffMutation();
  const [draft, setDraft] = useState<DraftState>(() => cloneDraft(plan));
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);

  useEffect(() => {
    setDraft(cloneDraft(plan));
  }, [plan]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(cloneDraft(plan));

  const setCredit = (feature: AiFeatureKey, raw: string) => {
    const key = creditLimitKey(feature);
    const trimmed = raw.trim();
    const value = trimmed === "" ? null : Math.max(0, Math.floor(Number(trimmed)));
    setDraft((d) => ({
      ...d,
      limits: {
        ...d.limits,
        [key]: Number.isNaN(value as number) ? d.limits[key] : value,
      },
    }));
    setSavedOk(false);
  };

  const setSeatLimit = (key: keyof AdminPlanLimits, raw: string) => {
    const trimmed = raw.trim();
    const value = trimmed === "" ? null : Math.max(0, Math.floor(Number(trimmed)));
    setDraft((d) => ({
      ...d,
      limits: {
        ...d.limits,
        [key]: Number.isNaN(value as number) ? d.limits[key] : value,
      },
    }));
    setSavedOk(false);
  };

  const setModel = (feature: AiFeatureKey, model: AiModelId) => {
    setDraft((d) => ({
      ...d,
      features: {
        ...d.features,
        ai_feature_models: { ...d.features.ai_feature_models, [feature]: model },
      },
    }));
    setSavedOk(false);
  };

  const onSave = async () => {
    setSaveError(null);
    setSavedOk(false);
    try {
      await updateM.mutateAsync({
        slug: plan.slug,
        limits: draft.limits,
        features: draft.features,
      });
      setSavedOk(true);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Save failed");
    }
  };

  return (
    <section className="rounded-2xl border border-black/[0.08] bg-background p-5 shadow-sm dark:border-white/[0.1]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold capitalize">{plan.name}</h2>
          <p className="text-xs text-foreground/50">slug: {plan.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          {savedOk ? <span className="text-xs text-success">Saved</span> : null}
          <Button
            variant="primary"
            size="sm"
            isDisabled={!dirty || updateM.isPending}
            onPress={() => void onSave()}
          >
            {updateM.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {saveError ? (
        <p role="alert" className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {saveError}
        </p>
      ) : null}

      <h3 className="mb-2 text-xs font-semibold tracking-wide text-foreground/50 uppercase">
        AI features — monthly credits + fixed model
      </h3>
      <div className="mb-5 overflow-x-auto rounded-xl border border-black/[0.06] dark:border-white/[0.08]">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="bg-[var(--surface-secondary)] text-xs text-foreground/60">
            <tr>
              <th className="px-3 py-2 font-semibold">Feature</th>
              <th className="px-3 py-2 font-semibold">Credits / month</th>
              <th className="px-3 py-2 font-semibold">Model</th>
            </tr>
          </thead>
          <tbody>
            {AI_FEATURE_KEYS.map((feature) => {
              const key = creditLimitKey(feature);
              const limit = draft.limits[key];
              const model = (draft.features.ai_feature_models[feature] ?? "gemini-flash") as AiModelId;
              return (
                <tr key={feature} className="border-t border-black/[0.06] dark:border-white/[0.08]">
                  <td className="px-3 py-2 font-medium">{AI_FEATURE_LABELS[feature]}</td>
                  <td className="px-3 py-2">
                    <Input
                      aria-label={`${feature} credits`}
                      value={limit === null || limit === undefined ? "" : String(limit)}
                      placeholder="∞ unlimited"
                      onChange={(e) => setCredit(feature, e.target.value)}
                      variant="secondary"
                      className="max-w-[10rem]"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      aria-label={`${feature} model`}
                      className="h-9 w-full max-w-[14rem] rounded-lg border border-black/[0.1] bg-background px-2 text-sm dark:border-white/[0.15]"
                      value={model}
                      onChange={(e) => setModel(feature, e.target.value as AiModelId)}
                    >
                      {AI_MODEL_IDS.map((id) => (
                        <option key={id} value={id}>
                          {AI_MODEL_LABELS[id]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mb-4 text-xs text-foreground/50">
        Empty credit field = unlimited. <code className="text-[11px]">0</code> = feature off. Models are fixed —
        clients cannot override.
      </p>

      <h3 className="mb-2 text-xs font-semibold tracking-wide text-foreground/50 uppercase">
        Seats & non-credit limits
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {SEAT_LIMIT_KEYS.map((key) => (
          <label key={key} className="flex flex-col gap-1 text-sm">
            <span className="text-foreground/70">{SEAT_LIMIT_LABELS[key] ?? key}</span>
            <Input
              value={
                draft.limits[key] === null || draft.limits[key] === undefined
                  ? ""
                  : String(draft.limits[key])
              }
              placeholder="∞ unlimited"
              onChange={(e) => setSeatLimit(key, e.target.value)}
              variant="secondary"
            />
          </label>
        ))}
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={draft.features.agentic_mode}
          onChange={(e) =>
            setDraft((d) => ({
              ...d,
              features: { ...d.features, agentic_mode: e.target.checked },
            }))
          }
        />
        Agentic mode enabled
      </label>
    </section>
  );
}

export function TariffsPageContent() {
  const query = useTariffsQuery();

  if (query.isLoading) {
    return <LoadingState label="Loading tariffs…" className="min-h-[40vh]" />;
  }

  if (query.isError) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </div>
    );
  }

  const plans = query.data ?? [];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold">Tariffs — AI credits & models</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Set monthly credit budgets and one fixed model per AI feature for each plan.
        </p>
      </div>
      {plans.length === 0 ? (
        <p className="text-sm text-foreground/50">
          No plans returned from <code className="text-xs">GET /admin/tariffs</code>. Deploy the backend
          credits migration first.
        </p>
      ) : (
        plans.map((plan) => <PlanCard key={plan.slug} plan={plan} />)
      )}
    </div>
  );
}
