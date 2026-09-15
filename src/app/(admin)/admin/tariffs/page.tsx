"use client";

import { useState } from "react";
import { Button, Input, Label, TextField, Tabs } from "@heroui/react";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import {
  useAdminAiModelPricingQuery,
  useAdminPlansQuery,
  useUpdateAdminAiModelPricingMutation,
  useUpdateAdminPlanMutation,
} from "@/features/admin/hooks/useAdminPlans";
import {
  ALL_AI_MODEL_IDS,
  ALL_CHANNELS,
  AI_MODEL_ID_LABELS,
  CHANNEL_LABELS,
  SEAT_LIMIT_KEYS,
  SEAT_LIMIT_LABELS,
  type AiModelPricingRow,
  type MessageChannel,
  type TariffPlan,
} from "@/features/admin/types";
import { AdminSectionCard } from "@/features/admin/components/AdminSectionCard";

/**
 * `/admin/plans/*` + `/admin/ai-model-pricing` — real, confirmed against
 * `admin-plans.controller.ts` / `admin-ai-model-pricing.controller.ts`.
 * Ported from the old `pages/Tariffs.tsx` (673 lines covering numeric
 * limits, channel/agentic-mode feature flags, a per-AI-feature model
 * assignment matrix, and model $/1M-token pricing). This pass covers the
 * numeric seat/storage limits, channel + agentic-mode toggles, and AI
 * model pricing edit — all real PATCH/PUT round-trips. The per-feature
 * model assignment matrix (`ai_feature_models`, 12 features × 7 models)
 * is read-only here rather than editable, to keep this page's scope
 * bounded; noted as a depth simplification in PROGRESS.md.
 */
export default function AdminTariffsPage() {
  const plans = useAdminPlansQuery();
  const pricing = useAdminAiModelPricingQuery();

  if (plans.isLoading) return <LoadingState label="Loading tariffs…" className="py-16" />;
  if (plans.isError) return <ErrorState error={plans.error} onRetry={() => plans.refetch()} className="py-16" />;
  const list = plans.data?.plans ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Tariffs</h1>
        <p className="text-sm text-foreground/60">Edit per-tier limits and features. Changes take effect immediately.</p>
      </div>

      <Tabs defaultSelectedKey={list[0]?.slug}>
        <Tabs.List>
          {list.map((p) => (
            <Tabs.Tab key={p.slug} id={p.slug}>
              {p.name}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        <div className="pt-4">
          {list.map((p) => (
            <Tabs.Panel key={p.slug} id={p.slug}>
              <PlanEditor plan={p} />
            </Tabs.Panel>
          ))}
        </div>
      </Tabs>

      <AdminSectionCard title="AI model pricing ($ / 1M tokens)">
        {pricing.isLoading ? <LoadingState label="Loading pricing…" /> : null}
        {pricing.isError ? <ErrorState error={pricing.error} onRetry={() => pricing.refetch()} /> : null}
        {pricing.data ? <PricingEditor rows={pricing.data.pricing} /> : null}
      </AdminSectionCard>
    </div>
  );
}

function PlanEditor({ plan }: { plan: TariffPlan }) {
  const updateM = useUpdateAdminPlanMutation();
  const [limits, setLimits] = useState(plan.limits);
  const [channels, setChannels] = useState<MessageChannel[]>(plan.features.channels ?? []);
  const [agentic, setAgentic] = useState(Boolean(plan.features.agentic_mode));
  const [saved, setSaved] = useState(false);

  function toggleChannel(c: MessageChannel) {
    setChannels((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  function save() {
    setSaved(false);
    updateM.mutate(
      { slug: plan.slug, patch: { limits, features: { channels, agentic_mode: agentic } } },
      { onSuccess: () => setSaved(true) },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SEAT_LIMIT_KEYS.map((key) => (
          <TextField key={key}>
            <Label>{SEAT_LIMIT_LABELS[key]}</Label>
            <Input
              type="number"
              value={limits[key] === null || limits[key] === undefined ? "" : String(limits[key])}
              placeholder="Unlimited"
              onChange={(e) => {
                const v = e.target.value;
                setLimits((prev) => ({ ...prev, [key]: v === "" ? null : Number(v) }));
              }}
            />
          </TextField>
        ))}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-foreground">Channels</p>
        <div className="flex flex-wrap gap-3">
          {ALL_CHANNELS.map((c) => (
            <label key={c} className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={channels.includes(c)} onChange={() => toggleChannel(c)} className="size-4 cursor-pointer accent-primary" />
              {CHANNEL_LABELS[c]}
            </label>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" checked={agentic} onChange={(e) => setAgentic(e.target.checked)} className="size-4 cursor-pointer accent-primary" />
        Agentic mode (AI-driven autopilot)
      </label>

      <div className="flex items-center gap-3">
        <Button size="sm" isDisabled={updateM.isPending} onPress={save}>
          {updateM.isPending ? "Saving…" : "Save"}
        </Button>
        {saved ? <span className="text-sm text-success">Saved.</span> : null}
        {updateM.isError ? <span className="text-sm text-danger">Failed to save.</span> : null}
      </div>

      {Object.keys(plan.features.ai_feature_models ?? {}).length > 0 ? (
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">AI model per feature (read-only)</p>
          <ul className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
            {Object.entries(plan.features.ai_feature_models).map(([feature, model]) => (
              <li key={feature} className="flex justify-between border-b border-divider/60 py-1">
                <span className="text-foreground/70">{feature}</span>
                <span className="text-foreground/50">{model}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function PricingEditor({ rows }: { rows: AiModelPricingRow[] }) {
  const updateM = useUpdateAdminAiModelPricingMutation();
  const [values, setValues] = useState<Record<string, { inputPer1M: number; outputPer1M: number }>>(() =>
    Object.fromEntries(rows.map((r) => [r.modelId, { inputPer1M: r.inputPer1M, outputPer1M: r.outputPer1M }])),
  );
  const [saved, setSaved] = useState(false);

  function save() {
    setSaved(false);
    updateM.mutate(
      ALL_AI_MODEL_IDS.map((m) => ({ modelId: m, ...(values[m] ?? { inputPer1M: 0, outputPer1M: 0 }) })),
      { onSuccess: () => setSaved(true) },
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-divider text-xs text-foreground/60">
            <th className="px-2 py-2">Model</th>
            <th className="px-2 py-2">Input $/1M</th>
            <th className="px-2 py-2">Output $/1M</th>
          </tr>
        </thead>
        <tbody>
          {ALL_AI_MODEL_IDS.map((m) => (
            <tr key={m} className="border-b border-divider/60">
              <td className="px-2 py-2 text-foreground">{AI_MODEL_ID_LABELS[m]}</td>
              <td className="px-2 py-1">
                <input
                  type="number"
                  step="0.01"
                  value={values[m]?.inputPer1M ?? 0}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [m]: { ...prev[m], inputPer1M: Number(e.target.value), outputPer1M: prev[m]?.outputPer1M ?? 0 } }))
                  }
                  className="w-28 rounded-md border border-divider bg-background px-2 py-1"
                />
              </td>
              <td className="px-2 py-1">
                <input
                  type="number"
                  step="0.01"
                  value={values[m]?.outputPer1M ?? 0}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [m]: { ...prev[m], outputPer1M: Number(e.target.value), inputPer1M: prev[m]?.inputPer1M ?? 0 } }))
                  }
                  className="w-28 rounded-md border border-divider bg-background px-2 py-1"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-3">
        <Button size="sm" isDisabled={updateM.isPending} onPress={save}>
          {updateM.isPending ? "Saving…" : "Save pricing"}
        </Button>
        {saved ? <span className="text-sm text-success">Saved.</span> : null}
      </div>
    </div>
  );
}
