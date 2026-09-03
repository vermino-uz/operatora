/**
 * REPLACE: app/admin/src/pages/Tariffs.tsx
 * Feature matrix: monthly credits + fixed model per AI feature; seat limits below.
 */

import React, { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  AI_FEATURE_KEYS,
  AI_FEATURE_LABELS,
  AI_MODEL_IDS,
  AI_MODEL_LABELS,
  SEAT_LIMIT_KEYS,
  SEAT_LIMIT_LABELS,
  creditLimitKey,
  useTariffs,
  useUpdateTariff,
  type AiFeatureKey,
  type AiModelId,
  type PlanFeatures,
  type PlanLimits,
  type TariffPlan,
} from '../hooks/useTariffs';

const TIER_TONES: Record<string, string> = {
  free: 'bg-slate-100 text-slate-700 border-slate-200',
  pro: 'bg-blue-100 text-blue-700 border-blue-200',
  max: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
  corporate: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

interface DraftState {
  limits: PlanLimits;
  features: PlanFeatures;
}

const cloneDraft = (plan: TariffPlan): DraftState => ({
  limits: { ...plan.limits },
  features: {
    channels: [...(plan.features.channels ?? [])],
    agentic_mode: !!plan.features.agentic_mode,
    ai_chat_models: plan.features.ai_chat_models ? [...plan.features.ai_chat_models] : undefined,
    ai_feature_models: { ...(plan.features.ai_feature_models ?? {}) },
  },
});

const PlanCard: React.FC<{ plan: TariffPlan }> = ({ plan }) => {
  const { toast } = useToast();
  const updateM = useUpdateTariff();
  const [draft, setDraft] = useState<DraftState>(() => cloneDraft(plan));

  useEffect(() => setDraft(cloneDraft(plan)), [plan]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(cloneDraft(plan));

  const setCredit = (feature: AiFeatureKey, raw: string) => {
    const key = creditLimitKey(feature);
    const trimmed = raw.trim();
    const value = trimmed === '' ? null : Math.max(0, Math.floor(Number(trimmed)));
    setDraft((d) => ({
      ...d,
      limits: { ...d.limits, [key]: Number.isNaN(value as number) ? d.limits[key] : value },
    }));
  };

  const setSeat = (key: keyof PlanLimits, raw: string) => {
    const trimmed = raw.trim();
    const value = trimmed === '' ? null : Math.max(0, Math.floor(Number(trimmed)));
    setDraft((d) => ({
      ...d,
      limits: { ...d.limits, [key]: Number.isNaN(value as number) ? d.limits[key] : value },
    }));
  };

  const setModel = (feature: AiFeatureKey, model: AiModelId) => {
    setDraft((d) => ({
      ...d,
      features: {
        ...d.features,
        ai_feature_models: { ...d.features.ai_feature_models, [feature]: model },
      },
    }));
  };

  const onSave = async () => {
    try {
      await updateM.mutateAsync({
        slug: plan.slug,
        limits: draft.limits,
        features: draft.features,
      });
      toast({ title: 'Saved', description: `${plan.name} tariffs updated` });
    } catch (e: any) {
      toast({
        title: 'Save failed',
        description: e?.message ?? 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            {plan.name}
            <Badge className={cn('border', TIER_TONES[plan.slug] ?? '')}>{plan.slug}</Badge>
          </CardTitle>
          <CardDescription>
            Monthly AI credits (token-weighted) + one fixed model per feature. Empty = unlimited, 0 =
            off.
          </CardDescription>
        </div>
        <Button onClick={onSave} disabled={!dirty || updateM.isPending}>
          {updateM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span className="ml-2">Save</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="bg-muted/50 text-left text-xs">
              <tr>
                <th className="px-3 py-2">Feature</th>
                <th className="px-3 py-2">Credits / month</th>
                <th className="px-3 py-2">Model</th>
              </tr>
            </thead>
            <tbody>
              {AI_FEATURE_KEYS.map((feature) => {
                const key = creditLimitKey(feature);
                const limit = draft.limits[key];
                const model = (draft.features.ai_feature_models[feature] ?? 'gemini-flash') as AiModelId;
                return (
                  <tr key={feature} className="border-t">
                    <td className="px-3 py-2 font-medium">{AI_FEATURE_LABELS[feature]}</td>
                    <td className="px-3 py-2">
                      <Input
                        className="max-w-[10rem]"
                        value={limit === null || limit === undefined ? '' : String(limit)}
                        placeholder="∞"
                        onChange={(e) => setCredit(feature, e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className="h-9 w-full max-w-[14rem] rounded-md border bg-background px-2"
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

        <div>
          <h3 className="mb-3 text-sm font-semibold">Seats & non-credit limits</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {SEAT_LIMIT_KEYS.map((key) => (
              <div key={key} className="space-y-1">
                <Label>{SEAT_LIMIT_LABELS[key] ?? key}</Label>
                <Input
                  value={
                    draft.limits[key] === null || draft.limits[key] === undefined
                      ? ''
                      : String(draft.limits[key])
                  }
                  placeholder="∞"
                  onChange={(e) => setSeat(key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            checked={draft.features.agentic_mode}
            onCheckedChange={(on) =>
              setDraft((d) => ({ ...d, features: { ...d.features, agentic_mode: on } }))
            }
          />
          <Label>Agentic mode</Label>
        </div>
      </CardContent>
    </Card>
  );
};

const TariffsPage: React.FC = () => {
  const { data, isLoading, error, refetch } = useTariffs();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading tariffs…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-destructive">Failed to load tariffs.</p>
        <Button className="mt-3" variant="outline" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Tariffs</h1>
        <p className="text-sm text-muted-foreground">
          Per-feature AI credit budgets and fixed models for Free / Pro / Max / Corporate.
        </p>
      </div>
      {(data ?? []).map((plan) => (
        <PlanCard key={plan.slug} plan={plan} />
      ))}
    </div>
  );
};

export default TariffsPage;
