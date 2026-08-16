"use client";

import { useState } from "react";
import { Button, Input, Label, Modal, Switch, TextField } from "@heroui/react";
import { ArrowRotateRight, Copy } from "@gravity-ui/icons";

import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import {
  useBoardShareQuery,
  useRotateBoardShareMutation,
  useUpdateBoardShareMutation,
} from "@/features/leads/hooks/useBoardManagement";
import { leadActionErrorMessage } from "@/features/leads/leadActionError";

const EXPIRY_PRESETS = [
  { key: "never", label: "Never expires", days: null as number | null },
  { key: "1", label: "In 1 day", days: 1 },
  { key: "7", label: "In 7 days", days: 7 },
  { key: "30", label: "In 30 days", days: 30 },
] as const;

/**
 * Board share-link settings (Phase 2c-5, item 4) — `board.controller.ts`'s
 * `/boards/:id/share*`. The public link itself is served by this app's own
 * `src/app/board/[token]/page.tsx` (unauthenticated, outside `(protected)`,
 * `GET /public/boards/:token`) — matches the old frontend's `/board/:token`
 * URL shape (a real, load-bearing UX detail: copying a link that pointed
 * nowhere would make "share" a broken feature, not a deferred one).
 */
export function ShareBoardDialog({ boardId, onClose }: { boardId: string; onClose: () => void }) {
  const shareQuery = useBoardShareQuery(boardId, true);
  const updateShare = useUpdateBoardShareMutation(boardId);
  const rotateShare = useRotateBoardShareMutation(boardId);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const settings = shareQuery.data;
  const shareUrl =
    settings?.token && typeof window !== "undefined" ? `${window.location.origin}/board/${settings.token}` : "";

  async function handleCopy() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function runUpdate(payload: { enabled?: boolean; password?: string | null; expiresAt?: string | null }) {
    if (updateShare.isPending) return; // guard double-submit
    setError(null);
    try {
      await updateShare.mutateAsync(payload);
    } catch (err) {
      setError(leadActionErrorMessage(err));
    }
  }

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Share board</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto">
              {shareQuery.isLoading || !settings ? (
                shareQuery.isError ? (
                  <ErrorState error={shareQuery.error} onRetry={() => shareQuery.refetch()} />
                ) : (
                  <LoadingState label="Loading share settings…" />
                )
              ) : (
                <>
                  <label className="flex items-center justify-between gap-4">
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-foreground">Public link</span>
                      <span className="block text-sm text-foreground/60">
                        Anyone with the link can view a read-only snapshot of this board.
                      </span>
                    </span>
                    <Switch
                      isSelected={settings.enabled}
                      isDisabled={updateShare.isPending}
                      onChange={(enabled) => void runUpdate({ enabled })}
                      aria-label="Public link enabled"
                    >
                      <Switch.Content>
                        <Switch.Control>
                          <Switch.Thumb />
                        </Switch.Control>
                      </Switch.Content>
                    </Switch>
                  </label>

                  {settings.enabled ? (
                    <>
                      <div className="flex items-center gap-2">
                        <TextField className="flex-1">
                          <Label className="sr-only">Share link</Label>
                          <Input value={shareUrl} readOnly />
                        </TextField>
                        <Button isIconOnly variant="secondary" aria-label="Copy link" onPress={() => void handleCopy()}>
                          <Copy className="size-4" aria-hidden="true" />
                        </Button>
                        <Button
                          isIconOnly
                          variant="secondary"
                          aria-label="Rotate link"
                          isDisabled={rotateShare.isPending}
                          onPress={() => rotateShare.mutate()}
                        >
                          <ArrowRotateRight className="size-4" aria-hidden="true" />
                        </Button>
                      </div>
                      {copied ? <p className="text-xs text-success">Copied.</p> : null}
                      <p className="text-xs text-foreground/50">
                        Rotating invalidates the previous link immediately — anyone with the old one loses access.
                      </p>

                      <div className="border-t border-black/[0.08] pt-3 dark:border-white/[0.12]">
                        <p className="mb-1.5 text-sm font-medium text-foreground">Link expiry</p>
                        <div className="flex flex-wrap gap-1.5">
                          {EXPIRY_PRESETS.map((preset) => (
                            <Button
                              key={preset.key}
                              size="sm"
                              variant="secondary"
                              isDisabled={updateShare.isPending}
                              onPress={() =>
                                void runUpdate({
                                  expiresAt:
                                    preset.days == null
                                      ? null
                                      : new Date(Date.now() + preset.days * 24 * 60 * 60 * 1000).toISOString(),
                                })
                              }
                            >
                              {preset.label}
                            </Button>
                          ))}
                        </div>
                        <p className="mt-1.5 text-xs text-foreground/50">
                          {settings.expiresAt
                            ? `Expires ${new Date(settings.expiresAt).toLocaleString()}`
                            : "This link never expires."}
                        </p>
                      </div>

                      <div className="border-t border-black/[0.08] pt-3 dark:border-white/[0.12]">
                        <p className="mb-1.5 text-sm font-medium text-foreground">
                          {settings.hasPassword ? "Password protected" : "No password set"}
                        </p>
                        <div className="flex items-center gap-2">
                          <TextField className="flex-1">
                            <Label className="sr-only">Set a password</Label>
                            <Input
                              type="text"
                              placeholder="Set a password (min 4 characters)"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                            />
                          </TextField>
                          <Button
                            variant="secondary"
                            size="sm"
                            isDisabled={password.trim().length < 4 || updateShare.isPending}
                            onPress={() => {
                              void runUpdate({ password: password.trim() });
                              setPassword("");
                            }}
                          >
                            Set
                          </Button>
                        </div>
                        {settings.hasPassword ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-1.5"
                            isDisabled={updateShare.isPending}
                            onPress={() => void runUpdate({ password: null })}
                          >
                            Remove password
                          </Button>
                        ) : null}
                      </div>
                    </>
                  ) : null}
                </>
              )}

              {error ? (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              ) : null}
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
