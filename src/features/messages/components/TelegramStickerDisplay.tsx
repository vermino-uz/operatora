"use client";

import { useState } from "react";

export interface TelegramStickerDisplayProps {
  src: string;
  preferVideo?: boolean;
  className?: string;
  onClick?: () => void;
  title?: string;
}

/** Static webp stickers as `<img>`, video stickers as muted loop `<video>`. */
export function TelegramStickerDisplay({
  src,
  preferVideo = false,
  className = "max-h-32 max-w-[min(128px,100%)] object-contain",
  onClick,
  title,
}: TelegramStickerDisplayProps) {
  const [stage, setStage] = useState<"img" | "video" | "fallback">(preferVideo ? "video" : "img");

  const body =
    stage === "img" ? (
      // eslint-disable-next-line @next/next/no-img-element -- proxied Telegram stream
      <img src={src} alt="Sticker" loading="lazy" className={className} onError={() => setStage("video")} />
    ) : stage === "video" ? (
      <video
        src={src}
        autoPlay
        loop
        muted
        playsInline
        className={className}
        onError={() => setStage("fallback")}
      />
    ) : (
      <span className="text-xs opacity-70">Sticker</span>
    );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} title={title} className="cursor-pointer text-start transition-opacity hover:opacity-90">
        {body}
      </button>
    );
  }

  return body;
}
