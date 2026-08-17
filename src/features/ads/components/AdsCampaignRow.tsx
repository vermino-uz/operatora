"use client";

import { useState } from "react";
import { Button, Chip } from "@heroui/react";
import { ChevronDown, ChevronRight, Filmstrip, Pause, Picture, Play, Video } from "@gravity-ui/icons";

import { formatMoney, type AdsCampaign, type AdsCreative } from "@/features/ads/types";
import { CreativeDetailModal } from "@/features/ads/components/CreativeDetailModal";

const FORMAT_ICON: Record<string, typeof Video> = { video: Video, carousel: Filmstrip, image: Picture };

function currencyLabel(code: string): string {
  return code === "UZS" ? "UZS" : code;
}

/** One campaign row, expandable to show its Instagram post creatives —
 * reference: old frontend's `components/ads/AdsCampaignRow.tsx`. */
export function AdsCampaignRow({
  campaign,
  onManage,
  onToggle,
}: {
  campaign: AdsCampaign;
  onManage: (c: AdsCampaign) => void;
  onToggle: (c: AdsCampaign) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selectedCreative, setSelectedCreative] = useState<AdsCreative | null>(null);
  const creatives = campaign.creatives ?? [];
  const currency = currencyLabel(campaign.currency);
  const active = campaign.status === "active";

  return (
    <div className="border-b border-black/[0.06] last:border-b-0 dark:border-white/[0.08]">
      <div className="flex h-14 items-center gap-3 px-3 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03] sm:px-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Show posts"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-foreground/50 transition-colors hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/[0.06]"
        >
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={() => onToggle(campaign)}
          title={active ? "Pause" : "Activate"}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-black/[0.08] text-foreground/60 transition-colors hover:bg-black/[0.04] dark:border-white/[0.12] dark:hover:bg-white/[0.06]"
        >
          {active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-foreground">{campaign.name}</p>
            <Chip size="sm" variant="soft" color={active ? "success" : "default"}>
              <Chip.Label>{active ? "Active" : "Paused"}</Chip.Label>
            </Chip>
            {campaign.isSample ? (
              <Chip size="sm" variant="soft">
                <Chip.Label>Sample</Chip.Label>
              </Chip>
            ) : null}
          </div>
          <p className="truncate text-xs text-foreground/50">
            {creatives.length > 0 ? `${creatives.length} posts` : "No posts"}
          </p>
        </div>

        <div className="hidden w-[120px] text-right sm:block">
          <p className="text-sm tabular-nums text-foreground">{formatMoney(campaign.dailyBudget)}</p>
          <p className="text-[11px] text-foreground/50">{currency}/day</p>
        </div>
        <div className="hidden w-[90px] text-right md:block">
          <p className="text-sm tabular-nums text-foreground">{formatMoney(campaign.metrics?.results ?? 0)}</p>
          <p className="text-[11px] text-foreground/50">Results</p>
        </div>
        <div className="w-[110px] text-right">
          <p className="text-sm font-medium tabular-nums text-foreground">{formatMoney(campaign.metrics?.spend ?? 0)}</p>
          <p className="text-[11px] text-foreground/50">Spend</p>
        </div>

        <Button size="sm" variant="secondary" onPress={() => onManage(campaign)}>
          Manage
        </Button>
      </div>

      {open ? (
        <div className="bg-black/[0.015] px-3 pb-3 dark:bg-white/[0.02] sm:px-4">
          <div className="flex flex-wrap items-center gap-1.5 pb-2.5 pt-1">
            {(campaign.audience?.locations ?? []).map((loc) => (
              <span
                key={loc}
                className="inline-flex h-6 items-center rounded-full border border-black/[0.08] px-2 text-[11.5px] text-foreground/70 dark:border-white/[0.12]"
              >
                {loc}
              </span>
            ))}
            {campaign.audience?.ageMin && campaign.audience?.ageMax ? (
              <span className="inline-flex h-6 items-center rounded-full border border-black/[0.08] px-2 text-[11.5px] text-foreground/70 dark:border-white/[0.12]">
                {campaign.audience.ageMin}-{campaign.audience.ageMax} y/o
              </span>
            ) : null}
          </div>

          {creatives.length === 0 ? (
            <p className="py-3 text-xs text-foreground/50">No posts in this campaign.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {creatives.map((cr) => {
                const Icon = FORMAT_ICON[cr.format] ?? Picture;
                return (
                  <button
                    key={cr.id}
                    type="button"
                    onClick={() => setSelectedCreative(cr)}
                    className="flex gap-3 rounded-xl border border-black/[0.08] p-2.5 text-left transition-colors hover:border-foreground/30 dark:border-white/[0.12]"
                  >
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-black/[0.08] bg-black/[0.03] dark:border-white/[0.12] dark:bg-white/[0.04]">
                      {cr.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- external Meta CDN thumbnail
                        <img src={cr.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Icon className="h-5 w-5 text-foreground/40" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-3 w-3 shrink-0 text-foreground/40" />
                        <span className="text-[11px] text-foreground/50">{cr.format}</span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs leading-[17px] text-foreground">{cr.caption}</p>
                      <p className="mt-1 text-xs font-semibold tabular-nums text-foreground">
                        {formatMoney(cr.spend)} {currency}
                        <span className="ml-1 text-[11px] font-normal text-foreground/50">spent</span>
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {selectedCreative ? (
        <CreativeDetailModal
          creative={selectedCreative}
          currency={currency}
          sample={campaign.isSample}
          onClose={() => setSelectedCreative(null)}
        />
      ) : null}
    </div>
  );
}
