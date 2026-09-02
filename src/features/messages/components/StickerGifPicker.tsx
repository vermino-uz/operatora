"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Clock, Magnifier, Plus, Sticker, TrashBin, Xmark } from "@gravity-ui/icons";

import { TelegramStickerDisplay } from "@/features/messages/components/TelegramStickerDisplay";
import { buildTelegramMessageMediaUrl } from "@/features/messages/lib/telegramMedia";
import type { TelegramChat } from "@/features/messages/types";
import { telegramMessagesApi } from "@/services/api/telegramMessages";
import {
  telegramAccountStickersApi,
  telegramStickersApi,
  type TelegramPickerSticker,
} from "@/services/api/telegramStickers";

export interface StickerGifPickerProps {
  chat: TelegramChat;
  onClose: () => void;
  onUploadGif: (file: File) => void;
  onSent?: () => void;
  accountMode?: boolean;
  senderId?: string;
}

function humanizeSendError(message: string): string {
  const m = String(message || "");
  if (/BUSINESS_PEER_USAGE_MISSING|STICKERSET|STICKER_/i.test(m)) {
    return "Couldn't send this sticker. Telegram Business may restrict some stickers — try another one.";
  }
  return m || "Failed to send. Try again.";
}

function dedupeByFileId<T extends { file_id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.file_id)) return false;
    seen.add(item.file_id);
    return true;
  });
}

function GifPreview({ src }: { src: string }) {
  const [useImg, setUseImg] = useState(false);
  if (useImg) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- proxied Telegram GIF thumb
      <img src={src} alt="" loading="lazy" className="h-[96px] w-full object-cover" />
    );
  }
  return (
    <video
      src={src}
      autoPlay
      loop
      muted
      playsInline
      className="h-[96px] w-full object-cover"
      onError={() => setUseImg(true)}
    />
  );
}

/** Telegram-style sticker & GIF picker for the message composer. */
export function StickerGifPicker({
  chat,
  onClose,
  onUploadGif,
  onSent,
  accountMode = false,
  senderId,
}: StickerGifPickerProps) {
  const [tab, setTab] = useState<"stickers" | "gifs">("stickers");
  const [sets, setSets] = useState<{ id: string; name: string; title: string | null }[]>([]);
  const [activeSet, setActiveSet] = useState<string>("recent");
  const [stickers, setStickers] = useState<TelegramPickerSticker[]>([]);
  const [recentStickers, setRecentStickers] = useState<{ file_id: string }[]>([]);
  const [loadingGrid, setLoadingGrid] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addValue, setAddValue] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentGifs, setRecentGifs] = useState<{ file_id: string }[]>([]);
  const [gifsLoading, setGifsLoading] = useState(false);
  const gifInputRef = useRef<HTMLInputElement>(null);
  const [gifQuery, setGifQuery] = useState("");
  const [gifResults, setGifResults] = useState<{ id: string; preview_url: string; send_url: string }[]>([]);
  const [gifSearching, setGifSearching] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const mediaUrl = useCallback((fileId: string) => buildTelegramMessageMediaUrl(fileId, chat), [chat]);

  useEffect(() => {
    if (accountMode) {
      void telegramAccountStickersApi
        .listSets()
        .then((r) => setSets((r.sets || []).map((s) => ({ id: s.id, name: s.id, title: s.title }))))
        .catch(() => setSets([]));
      void telegramAccountStickersApi
        .listStickers()
        .then((r) =>
          setRecentStickers(
            dedupeByFileId(
              [...(r.favorite || []), ...(r.recent || [])]
                .filter((s) => s.file_id)
                .map((s) => ({ file_id: s.file_id as string })),
            ),
          ),
        )
        .catch(() => setRecentStickers([]));
      return;
    }
    void telegramStickersApi.listSets().then(setSets).catch(() => setSets([]));
    void telegramStickersApi
      .listRecent(chat.id, "sticker")
      .then((rows) => setRecentStickers(dedupeByFileId(rows)))
      .catch(() => setRecentStickers([]));
  }, [chat.id, accountMode]);

  useEffect(() => {
    setError(null);
    if (activeSet === "recent") {
      setStickers([]);
      return;
    }
    setLoadingGrid(true);
    if (accountMode) {
      void telegramAccountStickersApi
        .getSetStickers(activeSet)
        .then((r) =>
          setStickers(
            dedupeByFileId(
              (r.stickers || [])
                .filter((s) => s.file_id)
                .map((s) => ({
                  file_id: s.file_id as string,
                  thumb_file_id: s.thumbnail_file_id || (s.file_id as string),
                  emoji: s.emoji || null,
                  is_animated: s.is_animated,
                  is_video: s.is_video,
                })),
            ),
          ),
        )
        .catch(() => {
          setStickers([]);
          setError("Couldn't load stickers. Try again.");
        })
        .finally(() => setLoadingGrid(false));
      return;
    }
    void telegramStickersApi
      .getSetStickers(activeSet, chat.id)
      .then((r) => setStickers(dedupeByFileId(r.stickers || [])))
      .catch(() => {
        setStickers([]);
        setError("Couldn't load stickers. Try again.");
      })
      .finally(() => setLoadingGrid(false));
  }, [activeSet, chat.id, accountMode]);

  useEffect(() => {
    if (tab !== "gifs") return;
    setGifsLoading(true);
    if (accountMode) {
      void telegramAccountStickersApi
        .listGifs()
        .then((r) =>
          setRecentGifs(
            dedupeByFileId(
              (r.animations || [])
                .filter((a) => a.file_id)
                .map((a) => ({ file_id: a.file_id as string })),
            ),
          ),
        )
        .catch(() => setRecentGifs([]))
        .finally(() => setGifsLoading(false));
      return;
    }
    void telegramStickersApi
      .listRecent(chat.id, "animation")
      .then((rows) => setRecentGifs(dedupeByFileId(rows)))
      .catch(() => setRecentGifs([]))
      .finally(() => setGifsLoading(false));
  }, [tab, chat.id, accountMode]);

  useEffect(() => {
    if (tab !== "gifs" || accountMode) return;
    const q = gifQuery.trim();
    if (!q) {
      setGifResults([]);
      setGifSearching(false);
      return;
    }
    setGifSearching(true);
    const timer = window.setTimeout(() => {
      void telegramStickersApi
        .searchGifs(q)
        .then(setGifResults)
        .catch(() => {
          setGifResults([]);
          setError("GIF search failed. Try again.");
        })
        .finally(() => setGifSearching(false));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [tab, gifQuery, accountMode]);

  async function sendFileId(fileId: string, kind: "sticker" | "animation") {
    if (sendingId) return;
    setSendingId(fileId);
    setError(null);
    try {
      await telegramMessagesApi.sendFile({
        chatId: chat.id,
        fileId,
        kind,
        senderId,
      });
      onSent?.();
      onClose();
    } catch (e) {
      setError(humanizeSendError(e instanceof Error ? e.message : ""));
    } finally {
      setSendingId(null);
    }
  }

  async function addSet() {
    const name = addValue.trim();
    if (!name || addBusy || accountMode) return;
    setAddBusy(true);
    setError(null);
    try {
      const row = await telegramStickersApi.addSet(name, chat.id);
      setSets((prev) => [...prev.filter((s) => s.name !== row.name), row]);
      setActiveSet(row.name);
      setAddOpen(false);
      setAddValue("");
    } catch {
      setError("Couldn't add sticker set. Check the name and try again.");
    } finally {
      setAddBusy(false);
    }
  }

  async function removeSet(row: { id: string; name: string }) {
    setSets((prev) => prev.filter((s) => s.id !== row.id));
    if (activeSet === row.name) setActiveSet("recent");
    try {
      await telegramStickersApi.removeSet(row.id);
    } catch {
      /* list already updated */
    }
  }

  const stickerGrid = useMemo(() => {
    const rows =
      activeSet === "recent"
        ? recentStickers.map((s) => ({ file_id: s.file_id, thumb: s.file_id }))
        : stickers.map((s) => ({ file_id: s.file_id, thumb: s.thumb_file_id }));
    return dedupeByFileId(rows);
  }, [activeSet, recentStickers, stickers]);

  return (
    <div className="flex h-[400px] w-[360px] max-w-[88vw] flex-col overflow-hidden rounded-xl border border-black/10 bg-background shadow-xl dark:border-white/10">
      <div className="flex shrink-0 items-center gap-1 border-b border-black/[0.06] px-2 pb-1 pt-2 dark:border-white/[0.06]">
        {(["stickers", "gifs"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`h-8 rounded-lg px-3.5 text-[12px] font-semibold transition-colors ${
              tab === k ? "bg-[#26A5E4] text-white" : "text-foreground/60 hover:bg-[var(--default)]"
            }`}
          >
            {k === "stickers" ? "Stickers" : "GIFs"}
          </button>
        ))}
        <div className="flex-1" />
        <button
          type="button"
          onClick={onClose}
          className="flex size-8 items-center justify-center rounded-full text-foreground/40 hover:bg-[var(--default)]"
          aria-label="Close picker"
        >
          <Xmark className="size-4" />
        </button>
      </div>

      {error ? (
        <div className="shrink-0 border-b border-danger/20 bg-danger/10 px-3 py-1.5 text-[11px] text-danger">{error}</div>
      ) : null}

      {tab === "stickers" ? (
        <>
          <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-black/[0.06] px-2 py-1.5 scrollbar-none dark:border-white/[0.06]">
            <button
              type="button"
              onClick={() => setActiveSet("recent")}
              className={`inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-[11px] font-medium ${
                activeSet === "recent" ? "bg-[#26A5E4]/10 text-[#1e95d0]" : "text-foreground/45 hover:bg-[var(--default)]"
              }`}
            >
              <Clock className="size-3" />
              Recent
            </button>
            {sets.map((s) => (
              <span key={s.id} className="group relative shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveSet(s.name)}
                  className={`h-7 max-w-[120px] truncate rounded-full px-2.5 text-[11px] font-medium ${
                    activeSet === s.name ? "bg-[#26A5E4]/10 text-[#1e95d0]" : "text-foreground/45 hover:bg-[var(--default)]"
                  }`}
                  title={s.title || s.name}
                >
                  {s.title || s.name}
                </button>
                {!accountMode ? (
                  <button
                    type="button"
                    onClick={() => void removeSet(s)}
                    className="absolute -right-1 -top-1 hidden size-4 items-center justify-center rounded-full border border-black/10 bg-background group-hover:flex dark:border-white/10"
                    aria-label="Remove sticker set"
                  >
                    <TrashBin className="size-2.5 text-danger" />
                  </button>
                ) : null}
              </span>
            ))}
            {!accountMode ? (
              <button
                type="button"
                onClick={() => setAddOpen((v) => !v)}
                className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-[11px] font-medium text-foreground/45 hover:bg-[var(--default)]"
              >
                <Plus className="size-3" />
                Add pack
              </button>
            ) : null}
          </div>

          {addOpen && !accountMode ? (
            <div className="flex shrink-0 items-center gap-1.5 border-b border-black/[0.06] px-2 py-1.5 dark:border-white/[0.06]">
              <input
                value={addValue}
                onChange={(e) => setAddValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void addSet();
                }}
                placeholder="Set name or t.me/addstickers/… link"
                className="h-8 flex-1 rounded-lg border border-black/10 px-2.5 text-[12px] outline-none focus:border-[#26A5E4] dark:border-white/10"
                autoFocus
              />
              <button
                type="button"
                onClick={() => void addSet()}
                disabled={addBusy || !addValue.trim()}
                className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#26A5E4] px-3 text-[12px] font-semibold text-white disabled:opacity-40"
              >
                Add
              </button>
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {loadingGrid ? (
              <div className="flex h-full items-center justify-center text-foreground/40">Loading…</div>
            ) : stickerGrid.length === 0 ? (
              <div className="flex h-full items-center justify-center px-6 text-center text-[12px] leading-relaxed text-foreground/45">
                {activeSet === "recent"
                  ? "No stickers yet. Stickers from your chats appear here — or add a pack above."
                  : "This pack is empty."}
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-1.5">
                {stickerGrid.map((s) => {
                  const url = mediaUrl(s.thumb);
                  if (!url) return null;
                  return (
                    <button
                      key={s.file_id}
                      type="button"
                      disabled={!!sendingId}
                      onClick={() => void sendFileId(s.file_id, "sticker")}
                      className="relative aspect-square rounded-lg p-1 transition-colors hover:bg-[var(--default)] disabled:opacity-60"
                    >
                      <TelegramStickerDisplay src={url} className="size-full object-contain" />
                      {sendingId === s.file_id ? (
                        <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/60">
                          …
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="flex shrink-0 items-center gap-1.5 border-b border-black/[0.06] px-2 py-1.5 dark:border-white/[0.06]">
            {!accountMode ? (
              <div className="relative flex-1">
                <Magnifier className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-foreground/40" />
                <input
                  value={gifQuery}
                  onChange={(e) => setGifQuery(e.target.value)}
                  placeholder="Search GIFs…"
                  className="h-8 w-full rounded-lg border border-black/10 pl-8 pr-2.5 text-[12px] outline-none focus:border-[#26A5E4] dark:border-white/10"
                />
              </div>
            ) : null}
            <input
              ref={gifInputRef}
              type="file"
              accept="image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  onUploadGif(file);
                  onClose();
                }
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => gifInputRef.current?.click()}
              className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-[#26A5E4] px-2.5 text-[12px] font-semibold text-white"
              title="Upload GIF file"
            >
              <Plus className="size-3.5" />
              GIF
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {gifQuery.trim() ? (
              gifSearching ? (
                <div className="flex h-full items-center justify-center text-foreground/40">Searching…</div>
              ) : gifResults.length === 0 ? (
                <div className="flex h-full items-center justify-center px-6 text-center text-[12px] text-foreground/45">
                  No GIFs found.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1.5">
                  {gifResults.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      disabled={!!sendingId}
                      onClick={() => void sendFileId(g.send_url, "animation")}
                      className="relative overflow-hidden rounded-lg bg-[var(--default)] transition-opacity hover:opacity-90 disabled:opacity-60"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- Tenor preview */}
                      <img src={g.preview_url} alt="" loading="lazy" className="h-[96px] w-full object-cover" />
                    </button>
                  ))}
                </div>
              )
            ) : gifsLoading ? (
              <div className="flex h-full items-center justify-center text-foreground/40">Loading…</div>
            ) : recentGifs.length === 0 ? (
              <div className="flex h-full items-center justify-center px-6 text-center text-[12px] text-foreground/45">
                No recent GIFs. Search above or upload a .gif file.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {recentGifs.map((g) => {
                  const url = mediaUrl(g.file_id);
                  if (!url) return null;
                  return (
                    <button
                      key={g.file_id}
                      type="button"
                      disabled={!!sendingId}
                      onClick={() => void sendFileId(g.file_id, "animation")}
                      className="relative overflow-hidden rounded-lg bg-[var(--default)] transition-opacity hover:opacity-90 disabled:opacity-60"
                    >
                      <GifPreview src={url} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
