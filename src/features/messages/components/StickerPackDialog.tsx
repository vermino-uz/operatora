"use client";

import { useEffect, useState } from "react";
import { Button, Modal, Spinner } from "@heroui/react";
import { Check, Plus } from "@gravity-ui/icons";

import { buildTelegramMessageMediaUrl } from "@/features/messages/lib/telegramMedia";
import type { TelegramChat } from "@/features/messages/types";
import { telegramMessagesApi } from "@/services/api/telegramMessages";
import { telegramStickersApi } from "@/services/api/telegramStickers";

export interface StickerPackDialogProps {
  isOpen: boolean;
  setName: string | null;
  chat: TelegramChat;
  onClose: () => void;
}

/** View a Telegram sticker set from the thread — add to workspace picker or send. */
export function StickerPackDialog({ isOpen, setName, chat, onClose }: StickerPackDialogProps) {
  const [title, setTitle] = useState("");
  const [stickers, setStickers] = useState<{ file_id: string; thumb_file_id: string; emoji: string | null }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !setName) return;
    setLoading(true);
    setError(null);
    setAdded(false);
    setStickers([]);
    setTitle("");
    void (async () => {
      try {
        const data = await telegramStickersApi.getSetStickers(setName, chat.id);
        setTitle(data.title || setName);
        setStickers(data.stickers ?? []);
      } catch {
        setError("Couldn't load sticker pack.");
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, setName, chat.id]);

  async function addPack() {
    if (!setName || adding || added) return;
    setAdding(true);
    setError(null);
    try {
      await telegramStickersApi.addSet(setName, chat.id);
      setAdded(true);
    } catch {
      setError("Couldn't add sticker pack.");
    } finally {
      setAdding(false);
    }
  }

  async function sendSticker(fileId: string) {
    if (sendingId) return;
    setSendingId(fileId);
    setError(null);
    try {
      await telegramMessagesApi.sendFile({ chatId: chat.id, fileId, kind: "sticker" });
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Couldn't send sticker.";
      setError(/BUSINESS_PEER_USAGE_MISSING|STICKERSET|STICKER_/i.test(msg) ? "Sticker unavailable for this chat." : msg);
    } finally {
      setSendingId(null);
    }
  }

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Container size="md">
        <Modal.Dialog className="max-w-[420px] overflow-hidden p-0">
          <Modal.Header className="flex items-center justify-between gap-3 border-b border-black/10 px-4 py-3 dark:border-white/10">
            <Modal.Heading className="truncate text-base">{title || "Sticker pack"}</Modal.Heading>
            <Button
              size="sm"
              variant={added ? "secondary" : "primary"}
              isDisabled={adding || added || !setName}
              onPress={() => void addPack()}
            >
              {adding ? <Spinner size="sm" /> : added ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
              {added ? "Added" : "Add pack"}
            </Button>
          </Modal.Header>
          <Modal.Body className="p-0">
            {error ? (
              <p className="border-b border-danger/20 bg-danger/5 px-4 py-2 text-xs text-danger">{error}</p>
            ) : null}
            <div className="max-h-[360px] overflow-y-auto p-3">
              {loading ? (
                <div className="flex h-40 items-center justify-center">
                  <Spinner size="md" />
                </div>
              ) : stickers.length === 0 ? (
                <p className="py-10 text-center text-xs text-foreground/45">No stickers in this pack.</p>
              ) : (
                <div className="grid grid-cols-4 gap-1.5">
                  {stickers.map((s) => (
                    <button
                      key={s.file_id}
                      type="button"
                      disabled={Boolean(sendingId)}
                      onClick={() => void sendSticker(s.file_id)}
                      title="Send sticker"
                      className="relative aspect-square rounded-lg p-1 transition-colors hover:bg-[var(--default)] disabled:opacity-60"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- proxied Telegram thumb */}
                      <img
                        src={buildTelegramMessageMediaUrl(s.thumb_file_id, chat)}
                        alt={s.emoji || ""}
                        loading="lazy"
                        className="size-full object-contain"
                      />
                      {sendingId === s.file_id ? (
                        <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/70">
                          <Spinner size="sm" />
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="border-t border-black/10 px-4 py-2.5 text-[11px] text-foreground/45 dark:border-white/10">
              Tap a sticker to send it immediately.
            </p>
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
