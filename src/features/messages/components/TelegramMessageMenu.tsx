"use client";

import { Dropdown, Separator } from "@heroui/react";
import {
  ArrowShapeTurnUpLeft as Reply,
  ArrowShapeTurnUpRight as Forward,
  ArrowDownToLine as Download,
  Copy,
  Link as LinkIcon,
  FaceSmile as Smile,
  Pencil,
  SquareCheck,
  TrashBin,
} from "@gravity-ui/icons";

import type { TelegramMessage } from "@/features/messages/types";

/** Same fixed quick-reaction set as the old frontend's
 * `TELEGRAM_QUICK_REACTIONS` — Telegram's reaction API only tracks one
 * emoji reaction per message per actor here, so this is a flat pick list,
 * not a full emoji picker. */
export const TELEGRAM_QUICK_REACTIONS = ["👍", "❤️", "🔥", "👏", "😂", "🎉", "🤔", "👀", "✅", "🙏"] as const;

export interface TelegramMessageMenuProps {
  message: TelegramMessage;
  /** Resolved proxy URL for photo/sticker media — enables "Save image". */
  mediaUrl?: string | null;
  onCopy: () => void;
  /** When set, shows "Copy link" for a shareable `t.me/…` message URL. */
  onCopyLink?: () => void;
  onSaveImage: () => void;
  onReply: () => void;
  onForward: () => void;
  onReact: (emoji: string | null) => void;
  onEdit: () => void;
  onDelete: () => void;
  onStartSelect: () => void;
  children: React.ReactNode;
}

/**
 * Per-message right-click context menu — HeroUI has no dedicated
 * "context menu" primitive (unlike the old frontend's shadcn/radix
 * `ContextMenu`), so this uses `Dropdown` (`@heroui/react`, react-aria
 * under the hood) with `trigger="contextMenu"`: the underlying
 * `MenuTrigger` primitive natively supports `'press' | 'longPress' |
 * 'contextMenu'` (see `react-stately/useMenuTriggerState`), so this is a
 * real supported mode, not a hand-rolled `onContextMenu` + controlled-open
 * hack. `Dropdown.Trigger` uses `display: contents` so the bubble stays the
 * flex-row sizing element (HeroUI Button defaults otherwise collapse width).
 *
 * Mirrors `TelegramMessageContextMenu.tsx`'s item set and gating, plus
 * "Copy link" when a shareable `t.me/…` URL can be built: copy (only when
 * there's text), copy link (when the message has a Telegram id and chat
 * peer), save image (only photo/sticker with a resolvable `mediaUrl`), reply, forward, react (quick-emoji submenu +
 * remove when already reacted), edit (outbound text messages only),
 * delete, then a separator and "Select".
 */
export function TelegramMessageMenu({
  message,
  mediaUrl,
  onCopy,
  onCopyLink,
  onSaveImage,
  onReply,
  onForward,
  onReact,
  onEdit,
  onDelete,
  onStartSelect,
  children,
}: TelegramMessageMenuProps) {
  const hasCopyText = Boolean((message.text_content || "").trim());
  const canSaveImage = Boolean(mediaUrl) && (message.message_kind === "photo" || message.message_kind === "sticker");
  const canEdit = message.direction === "outbound" && message.message_kind === "text" && Boolean((message.text_content || "").trim());
  const currentReaction = message.metadata?.operator_reaction ?? null;

  return (
    <Dropdown trigger="contextMenu">
      <Dropdown.Trigger className="!contents">{children}</Dropdown.Trigger>
      <Dropdown.Popover placement="bottom start">
        <Dropdown.Menu aria-label="Message actions" className="min-w-[190px]">
          {hasCopyText ? (
            <Dropdown.Item id="copy" onAction={onCopy}>
              <Copy className="size-3.5" aria-hidden="true" />
              Copy
            </Dropdown.Item>
          ) : null}
          {onCopyLink ? (
            <Dropdown.Item id="copy-link" onAction={onCopyLink}>
              <LinkIcon className="size-3.5" aria-hidden="true" />
              Copy link
            </Dropdown.Item>
          ) : null}
          {canSaveImage ? (
            <Dropdown.Item id="save-image" onAction={onSaveImage}>
              <Download className="size-3.5" aria-hidden="true" />
              Save image
            </Dropdown.Item>
          ) : null}
          <Dropdown.Item id="reply" onAction={onReply}>
            <Reply className="size-3.5" aria-hidden="true" />
            Reply
          </Dropdown.Item>
          <Dropdown.Item id="forward" onAction={onForward}>
            <Forward className="size-3.5" aria-hidden="true" />
            Forward
          </Dropdown.Item>
          <Dropdown.SubmenuTrigger>
            <Dropdown.Item id="react">
              <Smile className="size-3.5" aria-hidden="true" />
              React
              {currentReaction ? <span className="ml-auto text-sm">{currentReaction}</span> : null}
            </Dropdown.Item>
            <Dropdown.Popover placement="right top" className="p-0">
              <div className="p-2">
                <div
                  className="grid grid-cols-5 gap-0.5"
                  role="group"
                  aria-label="Quick reactions"
                >
                  {TELEGRAM_QUICK_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      aria-label={`React ${emoji}`}
                      aria-pressed={currentReaction === emoji}
                      className={`flex size-9 items-center justify-center rounded-lg text-lg leading-none transition-colors hover:bg-background ${
                        currentReaction === emoji ? "bg-[#26A5E4]/15 ring-1 ring-[#26A5E4]" : ""
                      }`}
                      onClick={() => onReact(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                {currentReaction ? (
                  <>
                    <Separator className="my-2" />
                    <button
                      type="button"
                      className="w-full rounded-md px-2 py-1.5 text-left text-sm text-danger hover:bg-danger/10"
                      onClick={() => onReact(null)}
                    >
                      Remove reaction
                    </button>
                  </>
                ) : null}
              </div>
            </Dropdown.Popover>
          </Dropdown.SubmenuTrigger>
          {canEdit ? (
            <Dropdown.Item id="edit" onAction={onEdit}>
              <Pencil className="size-3.5" aria-hidden="true" />
              Edit
            </Dropdown.Item>
          ) : null}
          <Dropdown.Item id="delete" onAction={onDelete} className="text-danger">
            <TrashBin className="size-3.5" aria-hidden="true" />
            Delete
          </Dropdown.Item>
          <Separator />
          <Dropdown.Item id="select" onAction={onStartSelect}>
            <SquareCheck className="size-3.5" aria-hidden="true" />
            Select
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
