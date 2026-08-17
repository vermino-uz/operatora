"use client";

import { useState, type ChangeEvent } from "react";
import { Button, Input, Label, Modal, TextField } from "@heroui/react";

import { ApiError } from "@/types/api";
import { useUpdateAudienceMutation, useUpdateBudgetMutation } from "@/features/ads/hooks/useAds";
import { formatMoney, type AdsCampaign } from "@/features/ads/types";

/** Budget + audience editor — reference: old frontend's inline "manage"
 * dialog in `pages/Ads.tsx`. Schedule editing (`POST /ads/schedule`, a real
 * endpoint) has no UI in the old frontend either — not built here either. */
export function ManageCampaignDialog({ campaign, onClose }: { campaign: AdsCampaign; onClose: () => void }) {
  const [budgetValue, setBudgetValue] = useState(String(campaign.dailyBudget));
  const [confirmingBudget, setConfirmingBudget] = useState(false);
  const [audienceCity, setAudienceCity] = useState((campaign.audience?.locations ?? []).join(", "));
  const [ageMin, setAgeMin] = useState(campaign.audience?.ageMin ? String(campaign.audience.ageMin) : "");
  const [ageMax, setAgeMax] = useState(campaign.audience?.ageMax ? String(campaign.audience.ageMax) : "");

  const updateBudget = useUpdateBudgetMutation();
  const updateAudience = useUpdateAudienceMutation();

  const budgetNum = Number(budgetValue);
  const budgetValid = Number.isFinite(budgetNum) && budgetNum > 0;

  const saveBudget = () => {
    if (!budgetValid) return;
    if (!confirmingBudget) {
      setConfirmingBudget(true);
      return;
    }
    updateBudget.mutate(
      { campaignId: campaign.id, dailyBudget: budgetNum },
      { onSuccess: () => setConfirmingBudget(false) },
    );
  };

  const saveAudience = () => {
    updateAudience.mutate({
      campaignId: campaign.id,
      audience: {
        locations: audienceCity.split(",").map((s) => s.trim()).filter(Boolean),
        ageMin: ageMin ? Number(ageMin) : null,
        ageMax: ageMax ? Number(ageMax) : null,
      },
    });
  };

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>{campaign.name}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <TextField>
                  <Label>Daily budget ({campaign.currency})</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={1}
                      value={budgetValue}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        setBudgetValue(e.target.value);
                        setConfirmingBudget(false);
                      }}
                    />
                    <Button variant="primary" isDisabled={!budgetValid || updateBudget.isPending} onPress={saveBudget}>
                      {updateBudget.isPending ? "Saving…" : confirmingBudget ? "Confirm" : "Save"}
                    </Button>
                  </div>
                </TextField>
                {confirmingBudget ? (
                  <p role="alert" className="text-xs text-warning">
                    This changes real ad spend to {formatMoney(budgetNum)} {campaign.currency}/day — click Confirm to apply.
                  </p>
                ) : null}
                {updateBudget.isError ? (
                  <p role="alert" className="text-xs text-danger">
                    {updateBudget.error instanceof ApiError ? updateBudget.error.message : "Couldn't save the budget."}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-3">
                <TextField>
                  <Label>Audience cities</Label>
                  <Input
                    value={audienceCity}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setAudienceCity(e.target.value)}
                    placeholder="e.g. Tashkent, Samarkand"
                  />
                </TextField>
                <div className="flex gap-2">
                  <TextField className="flex-1">
                    <Label>Age min</Label>
                    <Input type="number" value={ageMin} onChange={(e: ChangeEvent<HTMLInputElement>) => setAgeMin(e.target.value)} />
                  </TextField>
                  <TextField className="flex-1">
                    <Label>Age max</Label>
                    <Input type="number" value={ageMax} onChange={(e: ChangeEvent<HTMLInputElement>) => setAgeMax(e.target.value)} />
                  </TextField>
                </div>
                <Button variant="secondary" isDisabled={updateAudience.isPending} onPress={saveAudience}>
                  {updateAudience.isPending ? "Saving…" : "Save audience"}
                </Button>
                {updateAudience.isError ? (
                  <p role="alert" className="text-xs text-danger">
                    {updateAudience.error instanceof ApiError ? updateAudience.error.message : "Couldn't save the audience."}
                  </p>
                ) : null}
              </div>
            </Modal.Body>
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
