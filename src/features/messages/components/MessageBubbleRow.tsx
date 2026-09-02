"use client";

import { useEffect, useState, type ReactNode } from "react";

import { TelegramStickerDisplay } from "@/features/messages/components/TelegramStickerDisplay";
import { TelegramUserAvatar } from "@/features/messages/components/TelegramUserAvatar";
import { VoiceMessagePlayer } from "@/features/messages/components/VoiceMessagePlayer";
import { AgentVoiceContent } from "@/features/messages/components/agentic/AgentVoiceContent";
import {
  chatBubbleMediaClassName,
  chatMediaImageClassName,
  chatMediaWrapClassName,
  chatVerticalVideoClassName,
} from "@/features/messages/lib/chatMedia";
import { linkifyText, type PhoneNumberActions } from "@/features/messages/lib/linkifyText";
import type { InstagramMediaLayout } from "@/features/messages/lib/instagramMedia";
import type { TelegramInboundAvatar, TelegramOutboundAvatar } from "@/features/messages/lib/telegramSender";
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

  useEffect(() => {
    setFailed(false);
  }, [src, poster]);

  const frameClass = round
    ? "block size-[200px] shrink-0 rounded-full object-cover bg-black"
    : portrait
      ? className
      : `${className ?? ""} min-h-[90px] min-w-[160px] bg-black/5`;

  if (failed) {
    if (poster) {
      return (
        // eslint-disable-next-line @next/next/no-img-element -- proxied thumbnail stream
        <img src={poster} alt="Video" className={frameClass} />
      );
    }
    return (
      <div className={`${frameClass} flex items-center justify-center text-xs text-white/70`}>
        {round ? "Video message" : "Video unavailable"}
      </div>
    );
  }

  return (
    <video
      src={src}
      poster={poster ?? undefined}
      controls={!autoPlay}
      autoPlay={autoPlay}
      loop={loop}
      muted={muted ?? round}
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
  /** Video stickers should try `<video>` first. */
  mediaStickerPreferVideo?: boolean;
  /** File name for document attachments when caption is empty. */
  mediaDocumentLabel?: string | null;
  /** Shared contact card (Telegram `contact` messages). */
  mediaContactInfo?: { phone?: string; firstName?: string; lastName?: string } | null;
  /** Instagram share / story link label. */
  mediaLinkLabel?: string | null;
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
  /** Violet styling for AI agent outbound messages. */
  agentGenerated?: boolean;
  agentVoiceDurationSec?: number | null;
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
  /** Small circle beside outbound teammate bubbles. */
  outboundAvatar?: TelegramOutboundAvatar;
  /** Needed to resolve group-member profile photos. */
  avatarChat?: TelegramChat | null;
  /** Opens sticker pack viewer (Telegram stickers with a set name). */
  onStickerClick?: () => void;
  /** Clickable phone numbers in message text — Telegram linked-account actions. */
  phoneActions?: PhoneNumberActions | null;
  /** Telegram's numeric message id — used for deep-link scroll targets. */
  telegramMessageId?: number | null;
  /** Brief highlight ring when navigating from a `t.me/c/…/…` link. */
  highlighted?: boolean;
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
  mediaStickerPreferVideo = false,
  mediaDocumentLabel,
  mediaContactInfo,
  mediaLinkLabel,
  replyQuote,
  isEdited,
  reaction,
  selectionMode,
  selected,
  onToggleSelect,
  agentGenerated,
  agentVoiceDurationSec,
  wrapBubble,
  onPhotoClick,
  senderName,
  inboundAvatar,
  outboundAvatar,
  avatarChat,
  onStickerClick,
  phoneActions,
  telegramMessageId,
  highlighted = false,
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
  const isCaptionedFramedMedia = isFramedVisual && Boolean(caption);
  const bubbleMaxWidthClass = "max-w-[min(100%,320px)]";
  const hasVisualMedia = Boolean(mediaUrl) && (isPhoto || isSticker);
  const isVideoKind =
    mediaKind === "video" || mediaKind === "video_note" || mediaKind === "animation";
  const hasPlayableMedia =
    Boolean(mediaUrl) &&
    (isVideoKind || mediaKind === "voice" || mediaKind === "audio");
  const hasVideoPreview = isVideoKind && Boolean(mediaUrl || mediaPosterUrl);
  const hasDocument = Boolean(mediaUrl) && mediaKind === "document";
  const hasContact = mediaKind === "contact" && Boolean(mediaContactInfo);
  const hasLinkAttachment = mediaKind === "link" && Boolean(mediaLinkLabel);
  const hasAnyMedia = hasVisualMedia || hasPlayableMedia || hasVideoPreview || hasDocument || hasContact || hasLinkAttachment;

  const visualMediaClass = chatMediaImageClassName;
  const portraitVideoClass = chatVerticalVideoClassName;
  const roundVideoClass = "block size-[200px] shrink-0 rounded-full object-cover bg-black";
  const roundVideoWrap = (node: ReactNode) => <div className="inline-block shrink-0">{node}</div>;
  const framedMediaWrap = (node: ReactNode, onClick?: () => void, inBubble = false) => (
    <div
      className={
        inBubble
          ? `${chatMediaWrapClassName} overflow-hidden`
          : `${chatMediaWrapClassName} overflow-hidden rounded-[14px] border border-black/[0.08] dark:border-white/[0.12]`
      }
    >
      {onClick ? (
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              onClick();
            }
          }}
          className="block cursor-zoom-in bg-transparent p-0 outline-none"
          aria-label="Open photo preview"
        >
          {node}
        </div>
      ) : (
        node
      )}
    </div>
  );

  const mediaBody = (() => {
    if (!mediaKind) return null;
    const inBubble = isCaptionedFramedMedia;
    const photoClass = inBubble ? chatBubbleMediaClassName : visualMediaClass;
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
              className={photoClass}
              loading="eager"
              decoding="async"
              onError={() => setPhotoFailed(true)}
            />
          ),
          onPhotoClick,
          inBubble,
        );
      case "sticker":
        if (!mediaUrl) return null;
        return (
          <TelegramStickerDisplay
            src={mediaUrl}
            preferVideo={mediaStickerPreferVideo}
            onClick={onStickerClick}
            title={onStickerClick ? "View sticker pack" : undefined}
          />
        );
      case "video":
        if (!mediaUrl && mediaPosterUrl) {
          return framedMediaWrap(
            // eslint-disable-next-line @next/next/no-img-element -- proxied Telegram thumb
            <img
              src={mediaPosterUrl}
              alt="Video"
              className={
                inBubble
                  ? chatBubbleMediaClassName
                  : mediaLayout === "portrait"
                    ? portraitVideoClass
                    : `${visualMediaClass} min-h-[90px] min-w-[160px] bg-black/5`
              }
            />,
            undefined,
            inBubble,
          );
        }
        if (!mediaUrl) return null;
        return framedMediaWrap(
          <ChatVideoPlayer
            src={mediaUrl}
            poster={mediaPosterUrl}
            portrait={mediaLayout === "portrait"}
            className={
              inBubble
                ? chatBubbleMediaClassName
                : mediaLayout === "portrait"
                  ? portraitVideoClass
                  : visualMediaClass
            }
          />,
          undefined,
          inBubble,
        );
      case "video_note": {
        if (!mediaUrl && mediaPosterUrl) {
          return roundVideoWrap(
            // eslint-disable-next-line @next/next/no-img-element -- proxied Telegram thumb
            <img src={mediaPosterUrl} alt="Video message" className={roundVideoClass} />,
          );
        }
        if (!mediaUrl) {
          return roundVideoWrap(
            <div className={`${roundVideoClass} flex items-center justify-center text-xs text-white/70`}>
              Video message
            </div>,
          );
        }
        return roundVideoWrap(
          <ChatVideoPlayer src={mediaUrl} poster={mediaPosterUrl} round />,
        );
      }
      case "animation":
        if (!mediaUrl && mediaPosterUrl) {
          return framedMediaWrap(
            // eslint-disable-next-line @next/next/no-img-element -- proxied Telegram thumb
            <img
              src={mediaPosterUrl}
              alt="GIF"
              className={
                inBubble
                  ? chatBubbleMediaClassName
                  : `${visualMediaClass} min-h-[90px] min-w-[120px] bg-black/5`
              }
            />,
            undefined,
            inBubble,
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
            className={
              inBubble
                ? chatBubbleMediaClassName
                : mediaLayout === "portrait"
                  ? portraitVideoClass
                  : visualMediaClass
            }
          />,
          undefined,
          inBubble,
        );
      case "voice":
      case "audio":
        if (agentGenerated && isOutbound) {
          return <AgentVoiceContent durationSec={agentVoiceDurationSec} />;
        }
        if (!mediaUrl) return null;
        return <VoiceMessagePlayer src={mediaUrl} direction={direction} />;
      case "document":
        if (!mediaUrl) return null;
        const docLabel = mediaDocumentLabel || caption || "Download document";
        return (
          <a
            href={mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-current/15 px-2.5 py-1.5 text-xs font-medium underline-offset-2 hover:underline"
          >
            {docLabel}
          </a>
        );
      case "contact":
        if (!mediaContactInfo) return null;
        const contactName = [mediaContactInfo.firstName, mediaContactInfo.lastName]
          .filter(Boolean)
          .join(" ")
          .trim();
        return (
          <div className="flex min-w-[180px] flex-col gap-0.5 rounded-xl border border-current/15 px-3 py-2 text-xs">
            {contactName ? <span className="font-medium">{contactName}</span> : null}
            {mediaContactInfo.phone ? (
              <span className="tabular-nums opacity-80">{mediaContactInfo.phone}</span>
            ) : null}
          </div>
        );
      case "link":
        if (!mediaLinkLabel) return null;
        if (!mediaUrl) {
          return (
            <span className="inline-flex max-w-[240px] items-center gap-2 rounded-xl border border-current/15 px-3 py-2 text-xs font-medium">
              {mediaLinkLabel}
            </span>
          );
        }
        return (
          <a
            href={mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-[240px] items-center gap-2 rounded-xl border border-current/15 px-3 py-2 text-xs font-medium underline-offset-2 hover:underline"
          >
            {mediaLinkLabel}
          </a>
        );
      default:
        return null;
    }
  })();

  const captionLinkClass = isOutbound
    ? "break-words [overflow-wrap:anywhere] text-accent-foreground underline underline-offset-2"
    : "break-words [overflow-wrap:anywhere] text-[#26A5E4] underline underline-offset-2";
  const captionTextClass = "whitespace-pre-wrap break-words leading-[1.3125] [overflow-wrap:break-word]";
  const bubbleShellClass = agentGenerated && isOutbound
    ? "bg-[#7C3AED] text-white"
    : isOutbound
      ? "bg-accent text-accent-foreground"
      : "bg-[var(--default)] text-foreground";
  const timeRowClass = isSticker || isMediaOnly
    ? "text-foreground/45"
    : agentGenerated && isOutbound
      ? "text-white/75"
      : isOutbound
        ? "text-accent-foreground/70"
        : "text-foreground/40";

  const bubble = (
    <div
      className={`relative w-fit ${bubbleMaxWidthClass} text-start text-sm ${
        wrapBubble && !selectionMode ? "cursor-context-menu select-text" : ""
      } ${
        selectionMode && selected ? "ring-2 ring-accent ring-offset-2 ring-offset-background" : ""
      } ${
        isSticker || isMediaOnly
          ? "bg-transparent p-0"
          : isCaptionedFramedMedia
            ? `overflow-hidden rounded-2xl ${bubbleShellClass}`
            : `rounded-2xl px-3.5 py-2 leading-[1.3125] ${bubbleShellClass}`
      }`}
    >
      {replyQuote ? (
        <div
          className={`${
            isCaptionedFramedMedia ? "mx-3 mt-2" : "mb-1"
          } rounded-md border-l-2 px-2 py-1 text-xs ${
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
          className={`${captionTextClass} ${
            hasAnyMedia
              ? isMediaOnly
                ? "mt-1.5 rounded-2xl px-3 py-2 " + bubbleShellClass
                : isCaptionedFramedMedia
                  ? "px-3 pt-1.5"
                  : "mt-1.5"
              : ""
          }`}
        >
          {linkifyText(caption, captionLinkClass, phoneActions)}
        </p>
      ) : null}
      <div
        className={`flex items-center justify-end gap-1 text-[10px] ${
          isMediaOnly || isSticker ? "mt-0.5" : isCaptionedFramedMedia ? "px-3 pb-2 pt-0.5" : "mt-1"
        } ${timeRowClass}`}
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
      <div
        role="button"
        tabIndex={0}
        onClick={onToggleSelect}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggleSelect?.();
          }
        }}
        aria-pressed={Boolean(selected)}
        className="contents text-start outline-none"
      >
        {bubble}
      </div>
    );
  } else if (wrapBubble) {
    interactiveBubble = wrapBubble(bubble);
  }

  return (
    <div
      className={`flex w-full px-4 py-1 transition-shadow ${isOutbound ? "justify-end" : "justify-start"} ${highlighted ? "rounded-xl ring-2 ring-accent/60 ring-offset-2 ring-offset-background" : ""}`}
      {...(telegramMessageId != null ? { "data-tg-msg": telegramMessageId } : {})}
    >
      {!isOutbound && (senderName || inboundAvatar) ? (
        <div className="flex max-w-[min(100%,360px)] flex-col items-start">
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
      ) : isOutbound && (senderName || outboundAvatar) ? (
        <div className="flex max-w-[min(100%,360px)] flex-col items-end">
          {senderName ? (
            <span className="mb-0.5 pr-9 text-[11px] font-medium text-foreground/55">{senderName}</span>
          ) : null}
          <div className="flex flex-row-reverse items-end gap-2">
            {outboundAvatar ? (
              <div
                className="flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                style={{ backgroundColor: outboundAvatar.color }}
                aria-hidden="true"
              >
                {outboundAvatar.initials}
              </div>
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
