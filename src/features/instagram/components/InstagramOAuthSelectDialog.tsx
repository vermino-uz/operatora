"use client";

import { useState } from "react";
import { Avatar, Button, Modal } from "@heroui/react";

import { ApiError } from "@/types/api";
import { instagramApi } from "@/services/api/instagram";
import type { InstagramOAuthOption } from "@/features/instagram/types";

/** Shown when Meta returns more than one connectable Facebook Page/Instagram
 * Business account for the OAuth session — traced from the old frontend's
 * `InstagramOAuthSelectDialog.tsx`/`InstagramAccountSelectPanel.tsx`, calls
 * the same `POST /instagram/oauth-connect` finalize step. */
export function InstagramOAuthSelectDialog({
  open,
  onOpenChange,
  selectionToken,
  options,
  workspaceId,
  userId,
  onConnected,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectionToken: string | null;
  options: InstagramOAuthOption[];
  workspaceId: string | null;
  userId: string | null;
  onConnected: () => void;
}) {
  const [selectedPageId, setSelectedPageId] = useState<string | null>(options[0]?.page_id ?? null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentOptions = options.length > 0 ? options : [];
  const effectiveSelection = selectedPageId ?? currentOptions[0]?.page_id ?? null;

  async function handleConfirm() {
    if (!selectionToken || !effectiveSelection || connecting) return;
    setConnecting(true);
    setError(null);
    try {
      await instagramApi.oauthConnect({
        selectionToken,
        pageId: effectiveSelection,
        userId: userId ?? undefined,
        workspaceId: workspaceId ?? undefined,
      });
      onOpenChange(false);
      onConnected();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not connect this account. Please try again.");
    } finally {
      setConnecting(false);
    }
  }

  if (!selectionToken || currentOptions.length === 0) return null;

  return (
    <Modal isOpen={open} onOpenChange={(next) => !connecting && onOpenChange(next)}>
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Choose an Instagram account</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-3">
              <p className="text-sm text-foreground/60">
                Meta found multiple connectable accounts. Pick the one you want to link to this workspace.
              </p>
              <div className="flex flex-col gap-2">
                {currentOptions.map((opt) => {
                  const selected = opt.page_id === effectiveSelection;
                  return (
                    <button
                      key={opt.page_id}
                      type="button"
                      onClick={() => setSelectedPageId(opt.page_id)}
                      className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-black/[0.08] hover:border-black/[0.2] dark:border-white/[0.12] dark:hover:border-white/[0.3]"
                      }`}
                    >
                      <Avatar size="sm">
                        {opt.profile_picture_url ? <Avatar.Image src={opt.profile_picture_url} /> : null}
                        <Avatar.Fallback>{opt.instagram_username.slice(0, 2).toUpperCase()}</Avatar.Fallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">@{opt.instagram_username}</p>
                        <p className="truncate text-xs text-foreground/50">{opt.page_name}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              {error ? (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              ) : null}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" isDisabled={connecting} onPress={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button isDisabled={!effectiveSelection || connecting} onPress={handleConfirm}>
                {connecting ? "Connecting…" : "Connect"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
