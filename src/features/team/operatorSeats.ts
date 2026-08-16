import type { BillingFeatures, TeamMemberRow } from "@/features/team/types";

/**
 * Ported 1:1 from the old frontend's `lib/operatorSeats.ts` — pure display
 * layout logic (no network calls), computing which included/premium seat
 * slots are filled vs. empty from the real `GET /admin-users/operators`
 * list + `GET /billing/me` features. Not a guess: same field names
 * (`extra_operator_seats`, `limits.max_operators`), same seat-ordering rule
 * (oldest `joined_at` fills included seats first).
 */

export type SeatMember = Pick<
  TeamMemberRow,
  "user_id" | "full_name" | "email" | "joined_at" | "status" | "workspace_role" | "is_owner"
>;

export type SeatSlot = { kind: "filled"; member: SeatMember } | { kind: "empty" };

export interface OperatorSeatLayout {
  kind: "limited" | "unlimited" | "none";
  planName: string;
  included: number;
  extra: number;
  total: number | null;
  used: number;
  includedSlots: SeatSlot[];
  premiumSlots: SeatSlot[];
  hasEmptyIncluded: boolean;
  hasEmptyPremium: boolean;
  allIncludedUsed: boolean;
  canInvite: boolean;
}

function countUsedOperatorSeats(members: SeatMember[]): number {
  return members.filter((m) => !m.is_owner && m.workspace_role === "operator" && m.status !== "inactive").length;
}

function operatorMembersOnly(members: SeatMember[]): SeatMember[] {
  return members.filter((m) => !m.is_owner && m.workspace_role === "operator" && m.status !== "inactive");
}

function sortOperatorsStable(ops: SeatMember[]): SeatMember[] {
  return [...ops].sort((a, b) => {
    const at = a.joined_at ? new Date(a.joined_at).getTime() : Number.POSITIVE_INFINITY;
    const bt = b.joined_at ? new Date(b.joined_at).getTime() : Number.POSITIVE_INFINITY;
    if (at !== bt) return at - bt;
    return String(a.user_id).localeCompare(String(b.user_id));
  });
}

export function buildOperatorSeatLayout(
  members: SeatMember[],
  billing: BillingFeatures | null | undefined,
): OperatorSeatLayout {
  const planName = billing?.planName ?? "Free";
  const includedLimit = billing?.limits.max_operators;
  const extra = billing?.extra_operator_seats ?? 0;
  const used = countUsedOperatorSeats(members);
  const ops = sortOperatorsStable(operatorMembersOnly(members));

  if (!billing || includedLimit === 0) {
    return {
      kind: "none",
      planName,
      included: 0,
      extra,
      total: 0,
      used,
      includedSlots: [],
      premiumSlots: [],
      hasEmptyIncluded: false,
      hasEmptyPremium: false,
      allIncludedUsed: true,
      canInvite: false,
    };
  }

  if (includedLimit === null || includedLimit === undefined) {
    return {
      kind: "unlimited",
      planName,
      included: 0,
      extra: 0,
      total: null,
      used,
      includedSlots: ops.map((member) => ({ kind: "filled" as const, member })),
      premiumSlots: [],
      hasEmptyIncluded: true,
      hasEmptyPremium: false,
      allIncludedUsed: false,
      canInvite: true,
    };
  }

  const included = includedLimit;
  const total = included + extra;
  const includedUsed = Math.min(used, included);
  const includedFree = Math.max(0, included - used);
  const premiumUsed = Math.max(0, used - included);
  const premiumEmpty = Math.max(0, extra - premiumUsed);

  const includedSlots: SeatSlot[] = [
    ...ops.slice(0, includedUsed).map((member) => ({ kind: "filled" as const, member })),
    ...Array.from({ length: includedFree }, () => ({ kind: "empty" as const })),
  ];

  const premiumSlots: SeatSlot[] = [
    ...ops.slice(includedUsed, includedUsed + premiumUsed).map((member) => ({ kind: "filled" as const, member })),
    ...Array.from({ length: premiumEmpty }, () => ({ kind: "empty" as const })),
  ];

  return {
    kind: "limited",
    planName,
    included,
    extra,
    total,
    used,
    includedSlots,
    premiumSlots,
    hasEmptyIncluded: includedFree > 0,
    hasEmptyPremium: premiumEmpty > 0,
    allIncludedUsed: includedFree === 0,
    canInvite: used < total,
  };
}

export function canAddOperators(billing: BillingFeatures | null | undefined): boolean {
  if (!billing) return false;
  const limit = billing.limits.max_operators;
  if (limit === null) return true;
  return limit > 0;
}

/** Mirrors the old frontend's fallback price table (`resolveOperatorSeatPriceUzs`
 * backend-side): used only when `billing.operator_seat_price_uzs` isn't set. */
export function resolveSeatPriceUzs(billing: BillingFeatures | null | undefined): number {
  if (billing?.operator_seat_price_uzs != null && billing.operator_seat_price_uzs > 0) {
    return billing.operator_seat_price_uzs;
  }
  return billing?.planSlug === "max" ? 990_000 : 99_000;
}
