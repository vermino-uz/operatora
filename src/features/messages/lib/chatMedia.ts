/** Shared inbox media sizing — bubble width follows Telegram Web (max 320px). */
export const CHAT_MEDIA_MAX_W = 320;
export const CHAT_MEDIA_MAX_H = 400;

export const chatMediaImageClassName =
  "block max-w-[320px] max-h-[400px] w-auto h-auto object-contain rounded-[14px]";

/** Photo/video inside a captioned bubble — flush to bubble edges, no outer radius. */
export const chatBubbleMediaClassName =
  "block w-full max-h-[400px] h-auto object-contain bg-black/[0.04] dark:bg-black/20";

export const chatMediaWrapClassName = "inline-block w-fit max-w-full";

/** Reels / portrait IG video — fixed 9:16 cap, not a square box. */
export const chatVerticalVideoClassName =
  "w-auto max-w-[320px] rounded-[14px] bg-black aspect-[9/16] object-cover";
