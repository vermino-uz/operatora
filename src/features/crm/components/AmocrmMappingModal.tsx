"use client";

import { useState } from "react";
import { Button, ListBox, Modal, Select } from "@heroui/react";
import { TriangleExclamation } from "@gravity-ui/icons";

import type { AmocrmMappingChoice, AmocrmOperatorsPreview } from "@/features/crm/types";

/** Operator-mapping dialog before an amoCRM import — traced from the old
 * frontend's inline modal. Defaults: name-matched amoCRM users map to their
 * suggested operator; everyone else creates a new operator seat, unless
 * seats are short (then new-account candidates default to "skip" so the
 * import doesn't run into the seat limit partway through). */
export function AmocrmMappingModal({
  preview,
  onClose,
  onConfirm,
  submitting,
}: {
  preview: AmocrmOperatorsPreview | null;
  onClose: () => void;
  onConfirm: (mapping: Record<string, { action: "map" | "skip"; operatorId?: string }>) => void;
  submitting: boolean;
}) {
  const [choices, setChoices] = useState<Record<number, AmocrmMappingChoice>>({});

  // Re-derive defaults whenever a new `preview` arrives — adjusted during
  // render (same documented reset-on-prop-change pattern as
  // `AmocrmBoardsModal`/`useConversationAudio`), not in an effect.
  const [trackedPreview, setTrackedPreview] = useState(preview);
  if (preview !== trackedPreview) {
    setTrackedPreview(preview);
    if (preview) {
      const seatsShort =
        preview.seatAvailability.available !== null &&
        preview.seatAvailability.seatsNeeded > preview.seatAvailability.available;
      const defaults: Record<number, AmocrmMappingChoice> = {};
      for (const u of preview.amocrmUsers) {
        if (u.suggestedOperatorId) {
          defaults[u.id] = { action: "map", operatorId: u.suggestedOperatorId };
        } else if (u.wouldCreateNewSeat && seatsShort) {
          defaults[u.id] = { action: "skip" };
        } else {
          defaults[u.id] = { action: "create" };
        }
      }
      setChoices(defaults);
    } else {
      setChoices({});
    }
  }

  if (!preview) return null;

  const liveSeatsNeeded = preview.amocrmUsers.filter(
    (u) => (choices[u.id]?.action ?? "create") === "create",
  ).length;
  const seatsShort =
    preview.seatAvailability.available !== null && liveSeatsNeeded > preview.seatAvailability.available;

  function skipAllNew() {
    setChoices((prev) => {
      const next = { ...prev };
      for (const u of preview!.amocrmUsers) {
        if (!u.suggestedOperatorId) next[u.id] = { action: "skip" };
      }
      return next;
    });
  }

  function confirm() {
    const mapping: Record<string, { action: "map" | "skip"; operatorId?: string }> = {};
    for (const u of preview!.amocrmUsers) {
      const choice = choices[u.id];
      if (!choice || choice.action === "create") continue;
      if (choice.action === "skip") mapping[String(u.id)] = { action: "skip" };
      else mapping[String(u.id)] = { action: "map", operatorId: choice.operatorId };
    }
    onConfirm(mapping);
  }

  return (
    <Modal isOpen onOpenChange={(open) => !open && !submitting && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Map amoCRM users to operators</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto">
              {preview.seatAvailability.available !== null ? (
                <div
                  className={`flex items-center justify-between gap-3 rounded-lg border p-2.5 text-xs ${
                    seatsShort
                      ? "border-danger/30 bg-danger/10 text-danger"
                      : "border-black/[0.08] bg-black/[0.02] text-foreground/70 dark:border-white/[0.12] dark:bg-white/[0.04]"
                  }`}
                >
                  <p className="flex items-center gap-1.5">
                    {seatsShort ? <TriangleExclamation className="size-3.5 shrink-0" aria-hidden="true" /> : null}
                    {preview.seatAvailability.available} seat(s) available, {liveSeatsNeeded} needed for new accounts.
                  </p>
                  <Button size="sm" variant="secondary" onPress={skipAllNew}>
                    Skip all new
                  </Button>
                </div>
              ) : null}

              {preview.amocrmUsers.map((u) => {
                const choice = choices[u.id] ?? { action: "create" as const };
                const value = choice.action === "map" ? `map:${choice.operatorId}` : choice.action;
                return (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 rounded-lg border border-black/[0.08] p-2.5 dark:border-white/[0.12]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{u.name || u.email}</p>
                      <p className="truncate text-xs text-foreground/50">{u.email}</p>
                    </div>
                    <Select
                      aria-label={`Mapping for ${u.name || u.email}`}
                      value={value}
                      onChange={(key) => {
                        if (typeof key !== "string") return;
                        const next: AmocrmMappingChoice =
                          key === "create" || key === "skip"
                            ? { action: key }
                            : { action: "map", operatorId: key.slice(4) };
                        setChoices((prev) => ({ ...prev, [u.id]: next }));
                      }}
                      className="w-56"
                    >
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox
                          items={[
                            { id: "create", label: "Create new operator" },
                            ...preview.existingOperators.map((op) => ({
                              id: `map:${op.id}`,
                              label: op.email ? `${op.name} — ${op.email}` : op.name,
                            })),
                            { id: "skip", label: "Skip" },
                          ]}
                        >
                          {(opt) => (
                            <ListBox.Item id={opt.id} textValue={opt.label}>
                              {opt.label}
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          )}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </div>
                );
              })}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" isDisabled={submitting} onPress={onClose}>
                Cancel
              </Button>
              <Button isDisabled={submitting} onPress={confirm}>
                {submitting ? "Starting import…" : "Start import"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
