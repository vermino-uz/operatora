"use client";

import { useEffect, useState } from "react";

import {
  fetchTelegramUserPhotoFileId,
  telegramUserPhotoMediaUrl,
} from "@/features/messages/lib/telegramUserAvatar";
import type { TelegramChat } from "@/features/messages/types";

interface TelegramUserAvatarProps {
  chat: TelegramChat;
  telegramUserId: number;
  initials: string;
  color: string;
  className?: string;
}

/** Group-member avatar — resolves Bot API profile photo, falls back to initials. */
export function TelegramUserAvatar({
  chat,
  telegramUserId,
  initials,
  color,
  className = "size-7 shrink-0 overflow-hidden rounded-full text-[10px] font-semibold text-white flex items-center justify-center",
}: TelegramUserAvatarProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPhotoUrl(null);
    setFailed(false);

    void (async () => {
      const fileId = await fetchTelegramUserPhotoFileId(telegramUserId, chat);
      if (cancelled) return;
      if (!fileId) {
        setFailed(true);
        return;
      }
      setPhotoUrl(telegramUserPhotoMediaUrl(fileId, chat));
    })();

    return () => {
      cancelled = true;
    };
  }, [chat, telegramUserId]);

  return (
    <div className={className} style={{ backgroundColor: color }} aria-hidden="true">
      {photoUrl && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- proxied Telegram profile photo
        <img
          src={photoUrl}
          alt=""
          className="size-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        initials
      )}
    </div>
  );
}
