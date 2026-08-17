"use client";

import { useState } from "react";
import { Button, Chip, Modal } from "@heroui/react";
import { Filmstrip, Pause, Picture, Play, Video } from "@gravity-ui/icons";

import { ApiError } from "@/types/api";
import { useSetCreativeStatusMutation } from "@/features/ads/hooks/useAds";
import { formatMoney, type AdsCreative } from "@/features/ads/types";

const FORMAT_ICON: Record<string, typeof Video> = { video: Video, carousel: Filmstrip, image: Picture };

/** Reference: old frontend's `components/ads/CreativeDetailModal.tsx`. */
export function CreativeDetailModal({
  creative,
  currency,
  sample,
  onClose,
}: {
  creative: AdsCreative;
  currency: string;
  sample: boolean;
  onClose: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const setCreativeStatus = useSetCreativeStatusMutation();
  const Icon = FORMAT_ICON[creative.format] ?? Picture;
  const active = creative.status === "active";

  const toggle = () => {
    if (!active && !confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    setCreativeStatus.mutate(
      { adId: creative.id, status: active ? "paused" : "active" },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-foreground/40" />
                {creative.format}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-3">
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-black/[0.04] dark:bg-white/[0.06]">
                {creative.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- external Meta CDN thumbnail, not a local/optimizable asset
                  <img src={creative.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Icon className="h-10 w-10 text-foreground/30" />
                )}
              </div>

              {creative.caption ? <p className="text-sm text-foreground">{creative.caption}</p> : null}

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-black/[0.08] px-3 py-2 dark:border-white/[0.12]">
                  <p className="text-sm font-semibold tabular-nums text-foreground">
                    {formatMoney(creative.spend)} {currency}
                  </p>
                  <p className="text-[11px] text-foreground/50">Spend</p>
                </div>
                <div className="rounded-lg border border-black/[0.08] px-3 py-2 dark:border-white/[0.12]">
                  <p className="text-sm font-semibold tabular-nums text-foreground">{formatMoney(creative.impressions ?? 0)}</p>
                  <p className="text-[11px] text-foreground/50">Impressions</p>
                </div>
                <div className="rounded-lg border border-black/[0.08] px-3 py-2 dark:border-white/[0.12]">
                  <p className="text-sm font-semibold tabular-nums text-foreground">{formatMoney(creative.clicks ?? 0)}</p>
                  <p className="text-[11px] text-foreground/50">Clicks</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Chip size="sm" variant="soft" color={active ? "success" : "default"}>
                  <Chip.Label>{active ? "Active" : "Paused"}</Chip.Label>
                </Chip>
                {sample ? (
                  <Chip size="sm" variant="soft">
                    <Chip.Label>Sample</Chip.Label>
                  </Chip>
                ) : null}
              </div>

              {confirming ? (
                <p role="alert" className="text-sm text-warning">
                  Activating this post spends real budget. Confirm to continue.
                </p>
              ) : null}

              {setCreativeStatus.isError ? (
                <p role="alert" className="text-sm text-danger">
                  {setCreativeStatus.error instanceof ApiError ? setCreativeStatus.error.message : "Something went wrong."}
                </p>
              ) : null}
            </Modal.Body>
            <Modal.Footer>
              {confirming ? (
                <Button variant="secondary" onPress={() => setConfirming(false)}>
                  Cancel
                </Button>
              ) : null}
              <Button
                variant={confirming ? "primary" : "outline"}
                isDisabled={sample || setCreativeStatus.isPending}
                onPress={toggle}
              >
                {active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {setCreativeStatus.isPending ? "Saving…" : confirming ? "Confirm activate" : active ? "Pause post" : "Activate post"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
