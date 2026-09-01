"use client";

import { useState } from "react";

export interface TelegramStickerDisplayProps {
  src: string;
  preferVideo?: boolean;
  className?: string;
}

/** Static webp stickers as `<img>`, video stickers as muted loop `<video>`. */
export function TelegramStickerDisplay({
  src,
  preferVideo = false,
  className = "max-h-32 max-w-[min(128px,100%)] object-contain",
}: TelegramStickerDisplayProps) {
  const [stage, setStage] = useState<"img" | "video" | "fallback">(preferVideo ? "video" : "img");

  if (stage === "img") {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- proxied Telegram stream
      <img src={src} alt="Sticker" loading="lazy" className={className} onError={() => setStage("video")} />
    );
  }

  if (stage === "video") {
    return (
      <video
        src={src}
        autoPlay
        loop
        muted
        playsInline
        className={className}
        onError={() => setStage("fallback")}
      />
    );
  }

  return <span className="text-xs opacity-70">Sticker</span>;
}
