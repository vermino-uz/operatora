/** Shared inbox media sizing — bubble width follows intrinsic aspect ratio (ported from dev.operatora `channelShared`). */
export const CHAT_MEDIA_MAX_W = 280;
export const CHAT_MEDIA_MAX_H = 360;

export const chatMediaImageClassName =
  "block max-w-[280px] max-h-[360px] w-auto h-auto object-contain rounded-[14px]";

export const chatMediaWrapClassName = "inline-block w-fit max-w-full";

/** Reels / portrait IG video — fixed 9:16 cap, not a square box. */
export const chatVerticalVideoClassName =
  "w-auto max-w-[280px] rounded-[14px] bg-black aspect-[9/16] object-cover";
