import { apiFetch } from "@/services/api/client";

export interface TelegramStickerSetRow {
  id: string;
  name: string;
  title: string | null;
}

export interface TelegramPickerSticker {
  file_id: string;
  thumb_file_id: string;
  emoji: string | null;
  is_animated: boolean;
  is_video: boolean;
}

export interface TelegramAccountStickerSummary {
  id: string;
  set_id: string;
  emoji: string;
  is_animated: boolean;
  is_video: boolean;
  file_id: string | null;
  thumbnail_file_id: string | null;
}

export interface TelegramGifSearchResult {
  id: string;
  preview_url: string;
  send_url: string;
}

/** Bot-scoped sticker sets + recents (`telegram-stickers.controller.ts`). */
export const telegramStickersApi = {
  listSets(): Promise<TelegramStickerSetRow[]> {
    return apiFetch<TelegramStickerSetRow[]>("/telegram-stickers/sets").then((rows) => (Array.isArray(rows) ? rows : []));
  },

  listRecent(chatId: string, kind: "sticker" | "animation"): Promise<{ file_id: string }[]> {
    const qs = new URLSearchParams({ chat_id: chatId, kind });
    return apiFetch<{ file_id: string }[]>(`/telegram-stickers/recent?${qs}`).then((rows) =>
      Array.isArray(rows) ? rows : [],
    );
  },

  getSetStickers(name: string, chatId: string): Promise<{ title: string; stickers: TelegramPickerSticker[] }> {
    const qs = new URLSearchParams({ name, chat_id: chatId });
    return apiFetch(`/telegram-stickers/set-stickers?${qs}`);
  },

  addSet(name: string, chatId: string): Promise<TelegramStickerSetRow> {
    return apiFetch("/telegram-stickers/sets", { method: "POST", body: { name, chat_id: chatId } });
  },

  removeSet(id: string): Promise<void> {
    return apiFetch(`/telegram-stickers/sets/${encodeURIComponent(id)}`, { method: "DELETE" });
  },

  searchGifs(query: string, limit = 24): Promise<TelegramGifSearchResult[]> {
    const qs = new URLSearchParams({ q: query, limit: String(limit) });
    return apiFetch<TelegramGifSearchResult[]>(`/telegram-stickers/gif-search?${qs}`).then((rows) =>
      Array.isArray(rows) ? rows : [],
    );
  },
};

/** Linked-account sticker/GIF library (`telegram-account.controller.ts`). */
export const telegramAccountStickersApi = {
  listSets(): Promise<{ sets: { id: string; title: string; name: string }[] }> {
    return apiFetch("/telegram-account/stickers/sets");
  },

  listStickers(): Promise<{ recent: TelegramAccountStickerSummary[]; favorite: TelegramAccountStickerSummary[] }> {
    return apiFetch("/telegram-account/stickers");
  },

  getSetStickers(setId: string): Promise<{ title: string; stickers: TelegramAccountStickerSummary[] }> {
    return apiFetch(`/telegram-account/stickers/sets/${encodeURIComponent(setId)}`);
  },

  listGifs(): Promise<{ animations: { file_id: string | null }[] }> {
    return apiFetch("/telegram-account/gifs");
  },
};
