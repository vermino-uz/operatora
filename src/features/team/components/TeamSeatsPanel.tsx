"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar, Button } from "@heroui/react";
import { ArrowUpRight, PersonPlus, Sparkles } from "@gravity-ui/icons";

import { buildOperatorSeatLayout, resolveSeatPriceUzs, type SeatMember, type SeatSlot } from "@/features/team/operatorSeats";
import type { BillingFeatures } from "@/features/team/types";
import { RentSeatModal } from "@/features/team/components/RentSeatModal";

function formatSom(n: number): string {
  return `${new Intl.NumberFormat("uz-UZ").format(n)} so'm`;
}

function initials(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.trim() || "?";
  return source.charAt(0).toUpperCase();
}

function FilledSeatCard({ member, variant }: { member: SeatMember; variant: "included" | "premium" }) {
  return (
    <div
      className={`flex min-h-[104px] flex-col items-center justify-center gap-2 rounded-xl border px-3 py-4 ${
        variant === "premium"
          ? "border-violet-200 bg-gradient-to-b from-violet-50 to-transparent dark:border-violet-900/40"
          : "border-black/[0.08] dark:border-white/[0.12]"
      }`}
    >
      <Avatar size="sm">
        <Avatar.Fallback>{initials(member.full_name, member.email)}</Avatar.Fallback>
      </Avatar>
      <div className="w-full min-w-0 text-center">
        <p className="truncate text-xs font-semibold">{member.full_name || member.email || "—"}</p>
      </div>
      <span
        className={`rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase ${
          variant === "premium" ? "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200" : "bg-success/15 text-success"
        }`}
      >
        {variant === "premium" ? "Premium" : "Included"}
      </span>
    </div>
  );
}

function EmptySeatCard({ onInvite, variant }: { onInvite: () => void; variant: "included" | "premium" }) {
  return (
    <button
      type="button"
      onClick={onInvite}
      className={`flex min-h-[104px] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-3 py-4 transition-colors ${
        variant === "premium"
          ? "border-violet-300 bg-violet-50/40 hover:border-violet-400 hover:bg-violet-50 dark:border-violet-900/40 dark:bg-violet-950/10"
          : "border-success/40 bg-success/5 hover:border-success hover:bg-success/10"
      }`}
    >
      <PersonPlus className="size-4" aria-hidden="true" />
      <span className="text-xs font-semibold">Tap to invite</span>
    </button>
  );
}

function SeatSection({
  title,
  subtitle,
  accent,
  headerAction,
  children,
}: {
  title: string;
  subtitle?: string;
  accent?: "green" | "violet";
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  const border = accent === "violet" ? "border-violet-200 dark:border-violet-900/40" : accent === "green" ? "border-success/30" : "border-black/[0.08] dark:border-white/[0.12]";
  return (
    <div className={`overflow-hidden rounded-2xl border ${border}`}>
      <div className="flex items-start justify-between gap-3 border-b border-black/[0.06] bg-black/[0.02] px-4 py-3 dark:border-white/[0.08] dark:bg-white/[0.03]">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          {subtitle ? <p className="mt-0.5 text-xs text-foreground/50">{subtitle}</p> : null}
        </div>
        {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

/**
 * Seats/billing panel — included vs. premium seat visualization + rent flow.
 * Ported from `TeamSeatsPanel.tsx`. Renders nothing when the workspace's
 * plan doesn't allow inviting operators at all (`kind === "none"`) — the
 * upsell banner below handles that case instead.
 */
export function TeamSeatsPanel({
  workspaceId,
  members,
  billing,
  ownerMember,
  onInviteIncluded,
  onInvitePremium,
}: {
  workspaceId: string;
  members: SeatMember[];
  billing: BillingFeatures | null | undefined;
  ownerMember: SeatMember | null;
  onInviteIncluded: () => void;
  onInvitePremium: () => void;
}) {
  const [rentOpen, setRentOpen] = useState(false);
  const layout = buildOperatorSeatLayout(members, billing);
  const seatPriceUzs = resolveSeatPriceUzs(billing);

  if (layout.kind === "none") return null;

  return (
    <div className="space-y-4">
      {ownerMember ? (
        <div className="flex items-center gap-3 rounded-xl border border-black/[0.08] px-4 py-3 dark:border-white/[0.12]">
          <Avatar size="sm">
            <Avatar.Fallback>{initials(ownerMember.full_name, ownerMember.email)}</Avatar.Fallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{ownerMember.full_name || ownerMember.email}</p>
            <p className="truncate text-xs text-foreground/50">{ownerMember.email}</p>
          </div>
          <span className="inline-flex shrink-0 items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
            Owner
          </span>
        </div>
      ) : null}

      {layout.kind === "unlimited" ? (
        <SeatSection title={`${layout.planName} — unlimited seats`} subtitle={`${layout.used} teammates invited`}>
          <div className="flex flex-wrap gap-2">
            {layout.includedSlots.map((slot: SeatSlot) =>
              slot.kind === "filled" ? (
                <div key={slot.member.user_id} className="w-[136px]">
                  <FilledSeatCard member={slot.member} variant="included" />
                </div>
              ) : null,
            )}
            <button
              type="button"
              onClick={onInviteIncluded}
              className="flex min-h-[104px] w-[136px] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-black/[0.12] transition-colors hover:border-primary hover:bg-black/[0.02] dark:border-white/[0.15] dark:hover:bg-white/[0.04]"
            >
              <PersonPlus className="size-4" aria-hidden="true" />
              <span className="text-xs font-medium">Invite</span>
            </button>
          </div>
        </SeatSection>
      ) : (
        <>
          <SeatSection
            title="Included seats"
            subtitle={`${layout.planName} plan — ${Math.min(layout.used, layout.included)} of ${layout.included} used`}
            accent="green"
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {layout.includedSlots.map((slot: SeatSlot, index) =>
                slot.kind === "filled" ? (
                  <FilledSeatCard key={slot.member.user_id} member={slot.member} variant="included" />
                ) : (
                  <EmptySeatCard key={`free-${index}`} onInvite={onInviteIncluded} variant="included" />
                ),
              )}
            </div>
          </SeatSection>

          {layout.allIncludedUsed || layout.premiumSlots.length > 0 ? (
            <SeatSection
              title="Premium seats"
              subtitle="Extra seats billed monthly, on top of your plan"
              accent="violet"
              headerAction={
                layout.allIncludedUsed ? (
                  <Button size="sm" className="bg-violet-600 text-white hover:bg-violet-700" onPress={() => setRentOpen(true)}>
                    <Sparkles className="size-3.5" aria-hidden="true" />
                    Rent seats
                  </Button>
                ) : null
              }
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {layout.premiumSlots.map((slot: SeatSlot, index) =>
                  slot.kind === "filled" ? (
                    <FilledSeatCard key={slot.member.user_id} member={slot.member} variant="premium" />
                  ) : (
                    <EmptySeatCard key={`premium-empty-${index}`} onInvite={onInvitePremium} variant="premium" />
                  ),
                )}
                {layout.allIncludedUsed ? (
                  <button
                    type="button"
                    onClick={() => setRentOpen(true)}
                    className="flex min-h-[104px] flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-amber-300 bg-gradient-to-b from-amber-50 to-transparent px-3 py-4 transition-colors hover:border-amber-400 dark:border-amber-900/40"
                  >
                    <Sparkles className="size-4 text-amber-700 dark:text-amber-300" aria-hidden="true" />
                    <span className="text-xs font-semibold text-amber-950 dark:text-amber-200">Rent premium</span>
                    <span className="text-[11px] font-bold text-amber-900 dark:text-amber-300">{formatSom(seatPriceUzs)} / mo</span>
                  </button>
                ) : null}
              </div>
            </SeatSection>
          ) : null}
        </>
      )}

      {layout.kind === "limited" ? (
        <p className="px-1 text-xs text-foreground/50">
          Using {layout.used} of {layout.total ?? layout.included} seats.
        </p>
      ) : null}

      <RentSeatModal isOpen={rentOpen} workspaceId={workspaceId} billing={billing} onClose={() => setRentOpen(false)} />
    </div>
  );
}

/** Upsell banner shown when the workspace's plan doesn't allow inviting
 * operators at all — links to the checkout page, matching the old
 * frontend's `/checkout?cycle=yearly`. */
export function UpgradeToProBanner() {
  return (
    <div className="rounded-2xl border border-amber-300/70 bg-gradient-to-br from-amber-50 via-white to-amber-50/60 p-5 dark:border-amber-900/40 dark:from-amber-950/20 dark:via-transparent dark:to-amber-950/10">
      <div className="flex items-start gap-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm">
          <Sparkles className="size-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Upgrade to invite teammates</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-800/80 dark:text-amber-300/70">
            Your current plan doesn&apos;t include team seats. Upgrade to Pro or Max to invite operators to this workspace.
          </p>
          <Link
            href="/checkout?cycle=yearly"
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3.5 py-2 text-xs font-semibold text-background transition-opacity hover:opacity-90"
          >
            Upgrade to Pro
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
