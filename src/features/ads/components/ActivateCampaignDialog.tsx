"use client";

import { Button, Modal } from "@heroui/react";

import { ApiError } from "@/types/api";
import { useSetCampaignStatusMutation } from "@/features/ads/hooks/useAds";
import type { AdsCampaign } from "@/features/ads/types";

/** Activation spends real budget — server-mandatory `confirm: true`
 * (`code: 'confirmation_required'` otherwise). Pausing needs no confirm. */
export function ActivateCampaignDialog({ campaign, onClose }: { campaign: AdsCampaign; onClose: () => void }) {
  const setStatus = useSetCampaignStatusMutation();

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="sm">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Activate &ldquo;{campaign.name}&rdquo;?</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-2">
              <p className="text-sm text-foreground/70">
                This starts spending your daily budget of {campaign.dailyBudget} {campaign.currency} immediately.
              </p>
              {setStatus.isError ? (
                <p role="alert" className="text-sm text-danger">
                  {setStatus.error instanceof ApiError ? setStatus.error.message : "Couldn't activate the campaign."}
                </p>
              ) : null}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                isDisabled={setStatus.isPending}
                onPress={() =>
                  setStatus.mutate({ campaignId: campaign.id, status: "active" }, { onSuccess: onClose })
                }
              >
                {setStatus.isPending ? "Activating…" : "Activate"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
