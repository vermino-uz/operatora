"use client";

import { useState, type ReactNode } from "react";
import { Button, Modal, Switch, Tabs } from "@heroui/react";
import { Eye } from "@gravity-ui/icons";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import {
  CARD_STANDARD_FIELDS,
  buildCardVisibilityItems,
  useCardFieldVisibilityQuery,
  useDetailsFieldVisibilityQuery,
  useLeadCustomFieldsQuery,
  useSaveCardFieldVisibilityMutation,
  useSaveDetailsFieldVisibilityMutation,
  type FieldVisibilityItem,
} from "@/features/leads/hooks/useFieldVisibility";
import { leadActionErrorMessage } from "@/features/leads/leadActionError";

/**
 * Per-user field visibility manager (Phase 2c-6, item 3) — the old
 * frontend's `LeadFieldVisibilityManager.tsx` equivalent, ported as two
 * tabs since the real backend genuinely splits card vs. details-panel
 * visibility into two different stores (see
 * `services/api/leadFieldVisibility.ts`'s doc comments — this isn't a
 * client-side design choice, it mirrors the real, traced split):
 *  - "Kanban card" — `lead_field_visibility` via `preview-leads` (per-field
 *    `is_visible`/`display_order` rows).
 *  - "Details panel" — `user_preferences` (`lead_details_visibility`) via
 *    the db-proxy, a flat `{field_name: boolean}` map.
 * Both tabs list standard fields + the workspace's current custom fields.
 */
export function LeadFieldVisibilityManager({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"card" | "details">("card");

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading className="flex items-center gap-2">
                <Eye className="size-4" aria-hidden="true" />
                Field visibility
              </Modal.Heading>
            </Modal.Header>
            <Tabs selectedKey={tab} onSelectionChange={(key) => setTab(key as "card" | "details")}>
              <Tabs.List className="mx-auto mb-1 w-fit gap-0.5 rounded-lg border border-black/[0.08] p-0.5 dark:border-white/[0.12]">
                <Tabs.Tab id="card" className="data-[selected=true]:text-accent-soft-foreground">
                  Kanban card
                  <Tabs.Indicator className="bg-accent-soft" />
                </Tabs.Tab>
                <Tabs.Tab id="details" className="data-[selected=true]:text-accent-soft-foreground">
                  Details panel
                  <Tabs.Indicator className="bg-accent-soft" />
                </Tabs.Tab>
              </Tabs.List>
              <Modal.Body className="max-h-[70vh] overflow-y-auto">
                {tab === "card" ? <CardVisibilityTab /> : <DetailsVisibilityTab />}
              </Modal.Body>
            </Tabs>
            <Modal.Footer>
              <Button variant="secondary" onPress={onClose}>
                Close
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function FieldToggleList({
  items,
  onToggle,
}: {
  items: FieldVisibilityItem[];
  onToggle: (key: string, next: boolean) => void;
}) {
  const standard = items.filter((i) => !i.isCustom);
  const custom = items.filter((i) => i.isCustom);
  return (
    <div className="flex flex-col gap-4">
      <FieldGroup label="Standard fields">
        {standard.map((item) => (
          <FieldRow key={item.key} item={item} onToggle={onToggle} />
        ))}
      </FieldGroup>
      {custom.length > 0 ? (
        <FieldGroup label="Custom fields">
          {custom.map((item) => (
            <FieldRow key={item.key} item={item} onToggle={onToggle} />
          ))}
        </FieldGroup>
      ) : null}
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-foreground/40">{label}</p>
      <div className="divide-y divide-black/[0.06] overflow-hidden rounded-xl border border-black/[0.08] dark:divide-white/[0.08] dark:border-white/[0.12]">
        {children}
      </div>
    </div>
  );
}

function FieldRow({ item, onToggle }: { item: FieldVisibilityItem; onToggle: (key: string, next: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-black/[0.03] dark:hover:bg-white/[0.05]">
      <span className="flex min-w-0 items-center gap-2">
        {item.isCustom ? (
          <span className="shrink-0 rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-accent">CUSTOM</span>
        ) : null}
        <span className="truncate text-sm font-medium text-foreground">{item.label}</span>
      </span>
      <Switch isSelected={item.isVisible} onChange={(v) => onToggle(item.key, v)} aria-label={`Show ${item.label}`}>
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
        </Switch.Content>
      </Switch>
    </label>
  );
}

function CardVisibilityTab() {
  const bundleQuery = useCardFieldVisibilityQuery();
  const saveMutation = useSaveCardFieldVisibilityMutation();
  const [error, setError] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  if (bundleQuery.isLoading) return <LoadingState label="Loading card field settings…" />;
  if (bundleQuery.isError) return <ErrorState error={bundleQuery.error} onRetry={() => bundleQuery.refetch()} />;

  const baseItems = buildCardVisibilityItems(bundleQuery.data?.visibility ?? [], bundleQuery.data?.customFields ?? []);
  const items = baseItems.map((i) => (i.key in overrides ? { ...i, isVisible: overrides[i.key]! } : i));

  async function handleSave() {
    if (saveMutation.isPending) return; // guard double-submit
    setError(null);
    try {
      await saveMutation.mutateAsync(
        items.map((item, index) => ({ field_name: item.key, is_visible: item.isVisible, display_order: index })),
      );
      setOverrides({});
    } catch (err) {
      setError(leadActionErrorMessage(err));
    }
  }

  async function handleReset() {
    if (saveMutation.isPending) return;
    setError(null);
    const defaults = CARD_STANDARD_FIELDS.filter((f) => f.defaultVisible).map((f) => f.key);
    try {
      await saveMutation.mutateAsync(
        CARD_STANDARD_FIELDS.map((f, index) => ({ field_name: f.key, is_visible: defaults.includes(f.key), display_order: index })),
      );
      setOverrides({});
    } catch (err) {
      setError(leadActionErrorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-foreground/60">Choose which fields show on Kanban cards.</p>
      <FieldToggleList items={items} onToggle={(key, next) => setOverrides((prev) => ({ ...prev, [key]: next }))} />
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" isDisabled={saveMutation.isPending} onPress={() => void handleReset()}>
          Reset to default
        </Button>
        <Button variant="primary" size="sm" isDisabled={saveMutation.isPending} onPress={() => void handleSave()}>
          {saveMutation.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

function DetailsVisibilityTab() {
  const visibilityQuery = useDetailsFieldVisibilityQuery();
  const customFieldsQuery = useLeadCustomFieldsQuery();
  const saveMutation = useSaveDetailsFieldVisibilityMutation();
  const [error, setError] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const loading = visibilityQuery.isLoading || customFieldsQuery.isLoading;
  if (loading) return <LoadingState label="Loading details panel settings…" />;
  const queryError = visibilityQuery.error ?? customFieldsQuery.error;
  if (visibilityQuery.isError || customFieldsQuery.isError) {
    return (
      <ErrorState
        error={queryError}
        onRetry={() => {
          void visibilityQuery.refetch();
          void customFieldsQuery.refetch();
        }}
      />
    );
  }

  const saved = visibilityQuery.data ?? {};
  const standard = CARD_STANDARD_FIELDS.filter((f) => f.key !== "comments").map((f) => f.key);
  const items: FieldVisibilityItem[] = [
    ...standard.map((key): FieldVisibilityItem => ({
      key,
      label: CARD_STANDARD_FIELDS.find((f) => f.key === key)!.label,
      isCustom: false,
      isVisible: key in overrides ? overrides[key]! : (saved[key] ?? true),
    })),
    ...(customFieldsQuery.data ?? []).map((cf): FieldVisibilityItem => {
      const key = `custom_${cf.field_name}`;
      return { key, label: cf.field_name, isCustom: true, isVisible: key in overrides ? overrides[key]! : (saved[key] ?? true) };
    }),
  ];

  async function handleSave() {
    if (saveMutation.isPending) return; // guard double-submit
    setError(null);
    const next: Record<string, boolean> = { ...saved };
    for (const item of items) next[item.key] = item.isVisible;
    try {
      await saveMutation.mutateAsync(next);
      setOverrides({});
    } catch (err) {
      setError(leadActionErrorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-foreground/60">Choose which fields show in the lead details panel.</p>
      <FieldToggleList items={items} onToggle={(key, next) => setOverrides((prev) => ({ ...prev, [key]: next }))} />
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button variant="primary" size="sm" isDisabled={saveMutation.isPending} onPress={() => void handleSave()}>
          {saveMutation.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
