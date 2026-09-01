"use client";

import { useEffect, useState, type ReactNode } from "react";

import { TelegramStickerDisplay } from "@/features/messages/components/TelegramStickerDisplay";
import { TelegramUserAvatar } from "@/features/messages/components/TelegramUserAvatar";
import { VoiceMessagePlayer } from "@/features/messages/components/VoiceMessagePlayer";
import {
  chatMediaImageClassName,
  chatMediaWrapClassName,
  chatVerticalVideoClassName,
} from "@/features/messages/lib/chatMedia";
import { linkifyText, type PhoneNumberActions } from "@/features/messages/lib/linkifyText";
import type { InstagramMediaLayout } from "@/features/messages/lib/instagramMedia";
import type { TelegramInboundAvatar } from "@/features/messages/lib/telegramSender";
import type { TelegramChat } from "@/features/messages/types";

interface ChatVideoPlayerProps {
  src: string;
  poster?: string | null;
  round?: boolean;
  portrait?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  className?: string;
}

/** Inline chat video — shows a Telegram/IG thumb via `poster` so the bubble
 * isn't a zero-size box before metadata loads. */
function ChatVideoPlayer({
  src,
  poster,
  round,
  portrait,
  autoPlay,
  loop,
  muted,
  className,
}: ChatVideoPlayerProps) {
  const [failed, setFailed] = useState(false);

  const frameClass = round
    ? "size-[200px] rounded-full object-cover bg-black"
    : portrait
      ? className
      : `${className ?? ""} min-h-[90px] min-w-[160px] bg-black/5`;

  if (failed && poster) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- proxied thumbnail stream
      <img src={poster} alt="Video" className={frameClass} />
    );
  }

  return (
    <video
      src={src}
      poster={poster ?? undefined}
      controls={!autoPlay}
      autoPlay={autoPlay}
      loop={loop}
      muted={muted}
      preload="metadata"
      playsInline
      className={frameClass}
      onError={() => setFailed(true)}
    />
  );
}

export interface MessageBubbleRowProps {
  /** Plain-text body or photo caption. Omit when `mediaUrl` carries the whole message. */
  content?: string;
  direction: "inbound" | "outbound";
  timestamp?: string | null;
  status?: string | null;
  /** Proxied Telegram media URL (`telegramMessageMediaUrl`). */
  mediaUrl?: string | null;
  /** `photo`, `sticker`, etc. — controls image rendering and sticker chrome. */
  mediaKind?: string | null;
  /** Portrait video/reels use 9:16 sizing instead of landscape caps. */
  mediaLayout?: InstagramMediaLayout;
  /** JPEG poster for video messages (Telegram thumb / IG reel thumbnail). */
  mediaPosterUrl?: string | null;
  /** Reply-to quote strip shown above the bubble text (Telegram only, so
   * far — optional, other channels simply don't pass it). */
  replyQuote?: { author: string; text: string } | null;
  /** Shows an "edited" marker next to the timestamp. */
  isEdited?: boolean;
  /** The operator's own quick-reaction emoji, shown as a small badge on
   * the bubble's corner. */
  reaction?: string | null;
  /** Multi-select mode: renders a checkbox-style selectable row instead of
   * the normal context-menu-triggering bubble (mirrors the old frontend's
   * `TelegramMessageContextMenu`'s own selection-mode branch). */
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  /** Wraps the bubble node with a context-menu trigger (e.g. a HeroUI
   * `Dropdown` with `trigger="contextMenu"`). Ignored while `selectionMode`
   * is on. Left undefined by channels with no per-message menu yet
   * (Instagram/SMS) — the bubble renders exactly as before for them. */
  wrapBubble?: (bubble: ReactNode) => ReactNode;
  /** Opens the full-size photo preview (Telegram photos). */
  onPhotoClick?: () => void;
  /** Shown above inbound bubbles (Telegram groups / private chats). */
  senderName?: string;
  /** Small circle beside inbound bubbles. */
  inboundAvatar?: TelegramInboundAvatar;
  /** Needed to resolve group-member profile photos. */
  avatarChat?: TelegramChat | null;
  /** Clickable phone numbers in message text — Telegram linked-account actions. */
  phoneActions?: PhoneNumberActions | null;
}

/** Shared inbound/outbound text bubble for every Messages channel —
 * mirrors this codebase's own AI Chat `MessageBubble.tsx` bubble
 * conventions (rounded-2xl, accent fill for the "self" side) rather than
 * the old frontend's channel-specific bubble styling, per this feature's
 * "clean rebuild, not a visual port" brief. Telegram additionally wires
 * `replyQuote`/`isEdited`/`reaction`/`selectionMode`/`wrapBubble` for its
 * context-menu parity pass — see `TelegramMessageMenu.tsx`/`TelegramPanel.tsx`. */
export function MessageBubbleRow({
  content = "",
  direction,
  timestamp,
  status,
  mediaUrl,
  mediaKind,
  mediaLayout = "default",
  mediaPosterUrl,
  replyQuote,
  isEdited,
  reaction,
  selectionMode,
  selected,
  onToggleSelect,
  wrapBubble,
  onPhotoClick,
  senderName,
  inboundAvatar,
  avatarChat,
  phoneActions,
}: MessageBubbleRowProps) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    setPhotoFailed(false);
  }, [mediaUrl]);
  useEffect(() => {
    setAvatarFailed(false);
  }, [inboundAvatar?.url]);
  const isOutbound = direction === "outbound";
  const time = timestamp
    ? new Date(timestamp).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : "";
  const caption = content.trim();
  const isSticker = mediaKind === "sticker";
  const isPhoto = mediaKind === "photo";
  const isFramedVisual =
    isPhoto || mediaKind === "video" || mediaKind === "video_note" || mediaKind === "animation";
  const isMediaOnly = isFramedVisual && !caption && !replyQuote;
  const hasVisualMedia = Boolean(mediaUrl) && (isPhoto || isSticker);
  const isVideoKind =
    mediaKind === "video" || mediaKind === "video_note" || mediaKind === "animation";
  const hasPlayableMedia =
    Boolean(mediaUrl) &&
    (isVideoKind || mediaKind === "voice" || mediaKind === "audio");
  const hasVideoPreview = isVideoKind && Boolean(mediaUrl || mediaPosterUrl);
  const hasDocument = Boolean(mediaUrl) && mediaKind === "document";
  const hasAnyMedia = hasVisualMedia || hasPlayableMedia || hasVideoPreview || hasDocument;

  const visualMediaClass = chatMediaImageClassName;
  const portraitVideoClass = chatVerticalVideoClassName;
  const framedMediaWrap = (node: ReactNode, onClick?: () => void) => (
    <div
      className={`${chatMediaWrapClassName} overflow-hidden rounded-[14px] border border-black/[0.08] dark:border-white/[0.12]`}
    >
      {onClick ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="block cursor-zoom-in bg-transparent p-0 outline-none"
          aria-label="Open photo preview"
        >
          {node}
        </button>
      ) : (
        node
      )}
    </div>
  );

  const mediaBody = (() => {
    if (!mediaKind) return null;
    switch (mediaKind) {
      case "photo":
        if (!mediaUrl) return null;
        return framedMediaWrap(
          photoFailed ? (
            <div className="flex min-h-[80px] min-w-[120px] items-center justify-center px-3 text-xs text-foreground/50">
              Photo unavailable
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- proxied Telegram binary stream, not a static asset
            <img
              src={mediaUrl}
              alt="Photo"
              className={visualMediaClass}
              loading="eager"
              decoding="async"
              onError={() => setPhotoFailed(true)}
            />
          ),
          onPhotoClick,
        );
      case "sticker":
        if (!mediaUrl) return null;
        return <TelegramStickerDisplay src={mediaUrl} />;
      case "video":
      case "video_note":
        if (!mediaUrl && mediaPosterUrl) {
          return framedMediaWrap(
            // eslint-disable-next-line @next/next/no-img-element -- proxied Telegram thumb
            <img
              src={mediaPosterUrl}
              alt="Video"
              className={
                mediaKind === "video_note"
                  ? "size-[200px] rounded-full object-cover bg-black"
                  : mediaLayout === "portrait"
                    ? portraitVideoClass
                    : `${visualMediaClass} min-h-[90px] min-w-[160px] bg-black/5`
              }
            />,
          );
        }
        if (!mediaUrl) return null;
        return framedMediaWrap(
          <ChatVideoPlayer
            src={mediaUrl}
            poster={mediaPosterUrl}
            round={mediaKind === "video_note"}
            portrait={mediaLayout === "portrait"}
            className={mediaLayout === "portrait" ? portraitVideoClass : visualMediaClass}
          />,
        );
      case "animation":
        if (!mediaUrl && mediaPosterUrl) {
          return framedMediaWrap(
            // eslint-disable-next-line @next/next/no-img-element -- proxied Telegram thumb
            <img src={mediaPosterUrl} alt="GIF" className={`${visualMediaClass} min-h-[90px] min-w-[120px] bg-black/5`} />,
          );
        }
        if (!mediaUrl) return null;
        return framedMediaWrap(
          <ChatVideoPlayer
            src={mediaUrl}
            poster={mediaPosterUrl}
            autoPlay
            loop
            muted
            className={mediaLayout === "portrait" ? portraitVideoClass : visualMediaClass}
          />,
        );
      case "voice":
      case "audio":
        if (!mediaUrl) return null;
        return <VoiceMessagePlayer src={mediaUrl} direction={direction} />;
      case "document":
        if (!mediaUrl) return null;
        return (
          <a
            href={mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-current/15 px-2.5 py-1.5 text-xs font-medium underline-offset-2 hover:underline"
          >
            {caption || "Download document"}
          </a>
        );
      default:
        return null;
    }
  })();

  const captionLinkClass = isOutbound
    ? "break-all text-accent-foreground underline underline-offset-2"
    : "break-all text-[#26A5E4] underline underline-offset-2";

  const bubble = (
    <div
      className={`relative w-fit max-w-[min(70%,28rem)] text-start text-sm leading-snug ${
        wrapBubble && !selectionMode ? "cursor-context-menu select-text" : ""
      } ${
        selectionMode && selected ? "ring-2 ring-accent ring-offset-2 ring-offset-background" : ""
      } ${
        isSticker || isMediaOnly
          ? "bg-transparent p-0"
          : `rounded-2xl px-3.5 py-2 ${isOutbound ? "bg-accent text-accent-foreground" : "bg-[var(--default)] text-foreground"}`
      }`}
    >
      {replyQuote ? (
        <div
          className={`mb-1 rounded-md border-l-2 px-2 py-1 text-xs ${
            isOutbound ? "border-accent-foreground/40 bg-black/10" : "border-foreground/30 bg-black/5 dark:bg-white/10"
          }`}
        >
          <p className="truncate font-medium opacity-80">{replyQuote.author}</p>
          <p className="truncate opacity-70">{replyQuote.text}</p>
        </div>
      ) : null}
      {mediaBody}
      {caption && mediaKind !== "document" ? (
        <p
          className={`whitespace-pre-wrap break-words ${
            hasAnyMedia
              ? isMediaOnly
                ? "mt-1.5 rounded-2xl px-3 py-2 " +
                  (isOutbound ? "bg-accent text-accent-foreground" : "bg-[var(--default)] text-foreground")
                : "mt-1.5"
              : ""
          }`}
        >
          {linkifyText(caption, captionLinkClass, phoneActions)}
        </p>
      ) : null}
      <div
        className={`flex items-center justify-end gap-1 text-[10px] ${
          isMediaOnly || isSticker ? "mt-0.5" : "mt-1"
        } ${
          isSticker || isMediaOnly
            ? "text-foreground/45"
            : isOutbound
              ? "text-accent-foreground/70"
              : "text-foreground/40"
        }`}
      >
        {isEdited ? <span>edited</span> : null}
        <span>{time}</span>
        {isOutbound && status === "failed" ? <span className="text-danger">Failed</span> : null}
        {isOutbound && status === "pending" ? <span>Sending…</span> : null}
      </div>
      {reaction ? (
        <span
          className="absolute -bottom-2 right-2 rounded-full border border-black/10 bg-background px-1 text-xs leading-tight shadow-sm dark:border-white/10"
          aria-label={`Reacted ${reaction}`}
        >
          {reaction}
        </span>
      ) : null}
    </div>
  );

  let interactiveBubble: ReactNode = bubble;
  if (selectionMode) {
    interactiveBubble = (
      <button
        type="button"
        onClick={onToggleSelect}
        aria-pressed={Boolean(selected)}
        className="contents text-start outline-none"
      >
        {bubble}
      </button>
    );
  } else if (wrapBubble) {
    interactiveBubble = wrapBubble(bubble);
  }

  return (
    <div className={`flex w-full px-4 py-1 ${isOutbound ? "justify-end" : "justify-start"}`}>
      {!isOutbound && (senderName || inboundAvatar) ? (
        <div className="flex max-w-[min(85%,32rem)] flex-col items-start">
          {senderName ? (
            <span className="mb-0.5 pl-9 text-[11px] font-medium text-accent">{senderName}</span>
          ) : null}
          <div className="flex items-end gap-2">
            {inboundAvatar ? (
              inboundAvatar.telegramUserId && avatarChat ? (
                <TelegramUserAvatar
                  chat={avatarChat}
                  telegramUserId={inboundAvatar.telegramUserId}
                  initials={inboundAvatar.initials}
                  color={inboundAvatar.color}
                />
              ) : (
                <div
                  className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full text-[10px] font-semibold text-white"
                  style={{ backgroundColor: inboundAvatar.color }}
                  aria-hidden="true"
                >
                  {inboundAvatar.url && !avatarFailed ? (
                    // eslint-disable-next-line @next/next/no-img-element -- optional proxied avatar
                    <img
                      src={inboundAvatar.url}
                      alt=""
                      className="size-full object-cover"
                      onError={() => setAvatarFailed(true)}
                    />
                  ) : (
                    inboundAvatar.initials
                  )}
                </div>
              )
            ) : null}
            {interactiveBubble}
          </div>
        </div>
      ) : (
        interactiveBubble
      )}
    </div>
  );
}
