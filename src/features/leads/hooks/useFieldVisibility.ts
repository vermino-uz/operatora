"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { cardFieldVisibilityApi, detailsFieldVisibilityApi, type FieldVisibilityRow } from "@/services/api/leadFieldVisibility";
import { useLeadCustomFieldsQuery } from "@/features/leads/hooks/useLeadCustomFields";
import type { LeadCustomFieldDef } from "@/features/leads/customFieldTypes";

/** Built-in fields offered in the Kanban-card visibility manager — matches
 * the old frontend's `LeadFieldVisibilityManager.tsx`'s
 * `DEFAULT_STANDARD_FIELDS`/`STANDARD_FIELD_LABEL_KEYS` exactly (field-name
 * set, not the i18n keys — this app has no lead-feature i18n layer). */
export const CARD_STANDARD_FIELDS: { key: string; label: string; defaultVisible: boolean }[] = [
  { key: "first_name", label: "First name", defaultVisible: true },
  { key: "last_name", label: "Last name", defaultVisible: true },
  { key: "phone_number", label: "Phone number", defaultVisible: true },
  { key: "age", label: "Age", defaultVisible: true },
  { key: "marital_status", label: "Marital status", defaultVisible: true },
  { key: "academic_status", label: "Academic status", defaultVisible: false },
  { key: "created_at", label: "Created date", defaultVisible: true },
  { key: "deadline", label: "Deadline", defaultVisible: true },
  { key: "comments", label: "Comments", defaultVisible: false },
];

export const CUSTOM_FIELD_KEY_PREFIX = "custom_field_";
export function customFieldVisibilityKey(fieldName: string): string {
  return `${CUSTOM_FIELD_KEY_PREFIX}${fieldName}`;
}

export interface FieldVisibilityItem {
  key: string;
  label: string;
  isVisible: boolean;
  isCustom: boolean;
}

/** Merge the caller's saved rows (if any) with the standard-field defaults
 * + the workspace's current custom-field list — mirrors the old frontend's
 * `buildRowsFromBundle()`: an unset standard field defaults per
 * `defaultVisible`; an unset custom field defaults to visible only when the
 * caller has never saved a view at all (a brand-new custom field added
 * later stays hidden from an existing customized view until explicitly
 * turned on — same "explicit setting wins" precedent). */
export function buildCardVisibilityItems(
  saved: FieldVisibilityRow[],
  customFields: LeadCustomFieldDef[],
): FieldVisibilityItem[] {
  const hasSaved = saved.length > 0;
  const byKey = new Map(saved.map((s) => [s.field_name, s]));

  const standard = CARD_STANDARD_FIELDS.map((f): FieldVisibilityItem => ({
    key: f.key,
    label: f.label,
    isCustom: false,
    isVisible: byKey.has(f.key) ? Boolean(byKey.get(f.key)!.is_visible) : hasSaved ? false : f.defaultVisible,
  }));

  const custom = customFields.map((cf): FieldVisibilityItem => {
    const key = customFieldVisibilityKey(cf.field_name);
    const setting = byKey.get(key);
    return {
      key,
      label: cf.field_name,
      isCustom: true,
      isVisible: setting ? Boolean(setting.is_visible) : !hasSaved,
    };
  });

  return [...standard, ...custom];
}

/** Kanban-card field visibility bundle (Phase 2c-6). */
export function useCardFieldVisibilityQuery() {
  return useQuery({
    queryKey: ["lead-field-visibility-bundle"],
    queryFn: () => cardFieldVisibilityApi.getBundle(),
    staleTime: 30_000,
  });
}

/** Read-only helper for card rendering (`LeadCard`) — returns a
 * `Set<string>` of visible field keys (standard + `custom_field_<name>`),
 * falling back to the same defaults `buildCardVisibilityItems()` uses so a
 * card never renders zero fields just because the caller never opened the
 * visibility manager. */
export function useVisibleCardFieldKeys(): Set<string> {
  const bundleQuery = useCardFieldVisibilityQuery();
  const items = buildCardVisibilityItems(bundleQuery.data?.visibility ?? [], bundleQuery.data?.customFields ?? []);
  return new Set(items.filter((i) => i.isVisible).map((i) => i.key));
}

export function useSaveCardFieldVisibilityMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fields: FieldVisibilityRow[]) => cardFieldVisibilityApi.save(fields),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-field-visibility-bundle"] });
    },
  });
}

/** Lead-details-panel field visibility (Phase 2c-6) — separate storage from
 * the card visibility above (see `services/api/leadFieldVisibility.ts`'s
 * `detailsFieldVisibilityApi` doc comment for why: the old frontend itself
 * uses two entirely different backing stores for card vs. details
 * visibility, and this app mirrors that same real split rather than
 * inventing a unified one). */
export function useDetailsFieldVisibilityQuery() {
  return useQuery({
    queryKey: ["lead-details-field-visibility"],
    queryFn: () => detailsFieldVisibilityApi.get(),
    staleTime: 30_000,
  });
}

export function useSaveDetailsFieldVisibilityMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (preferences: Record<string, boolean>) => detailsFieldVisibilityApi.save(preferences),
    onSuccess: (_data, preferences) => {
      queryClient.setQueryData(["lead-details-field-visibility"], preferences);
    },
  });
}

/** Convenience re-export so callers of the visibility manager don't need a
 * second import for the custom-field list it also needs. */
export { useLeadCustomFieldsQuery };
