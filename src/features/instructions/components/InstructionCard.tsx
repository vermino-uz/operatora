"use client";

import { useState } from "react";
import { Button, Chip } from "@heroui/react";
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  ChevronDown,
  ChevronRight,
  Comment,
  Pencil,
  Person,
  Star,
  Tag,
  TrashBin,
} from "@gravity-ui/icons";

import type { InstructionRow } from "@/features/instructions/types";

const PRIORITY_COLOR: Record<string, "danger" | "warning" | "default"> = {
  high: "danger",
  medium: "warning",
  low: "default",
};

export function InstructionCard({
  instruction,
  canEdit,
  canMoveUp,
  canMoveDown,
  isDeleting,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  instruction: InstructionRow;
  canEdit: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  isDeleting?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-black/[0.08] bg-card dark:border-white/[0.12]">
      <div className="flex items-center gap-2 p-3">
        {canEdit ? (
          <div className="flex flex-col">
            <Button size="sm" variant="ghost" isIconOnly aria-label="Move up" isDisabled={!canMoveUp} onPress={onMoveUp}>
              <ArrowUp className="size-3.5" />
            </Button>
            <Button size="sm" variant="ghost" isIconOnly aria-label="Move down" isDisabled={!canMoveDown} onPress={onMoveDown}>
              <ArrowDown className="size-3.5" />
            </Button>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          {expanded ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-foreground">{instruction.title}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Chip size="sm" color={PRIORITY_COLOR[instruction.priority] ?? "default"} variant="soft">
                <Chip.Label className="capitalize">{instruction.priority}</Chip.Label>
              </Chip>
              <Chip size="sm" color="default" variant="soft">
                <Chip.Label>{instruction.category}</Chip.Label>
              </Chip>
              {instruction.effectiveness > 0 ? (
                <Chip size="sm" color="success" variant="soft">
                  <Chip.Label>{instruction.effectiveness}% effective</Chip.Label>
                </Chip>
              ) : null}
            </div>
          </div>
        </button>

        {canEdit ? (
          <div className="flex shrink-0 gap-1">
            <Button size="sm" variant="ghost" isIconOnly aria-label="Edit" onPress={onEdit}>
              <Pencil className="size-4" />
            </Button>
            <Button size="sm" variant="ghost" isIconOnly aria-label="Delete" isDisabled={isDeleting} onPress={onDelete}>
              <TrashBin className="size-4 text-danger" />
            </Button>
          </div>
        ) : null}
      </div>

      {expanded ? (
        <div className="border-t border-black/[0.06] px-4 py-3.5 dark:border-white/[0.08]">
          <p className="whitespace-pre-wrap text-sm text-foreground/80">{instruction.content}</p>

          {instruction.target_operators?.length ? (
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-medium text-foreground/60">Target operators</p>
              <div className="flex flex-wrap gap-1">
                {instruction.target_operators.map((op) => (
                  <Chip key={op} size="sm" color="default" variant="soft">
                    <Person className="mr-1 size-3" />
                    <Chip.Label>{op}</Chip.Label>
                  </Chip>
                ))}
              </div>
            </div>
          ) : null}

          {instruction.tags?.length ? (
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-medium text-foreground/60">Tags</p>
              <div className="flex flex-wrap gap-1">
                {instruction.tags.map((tag) => (
                  <Chip key={tag} size="sm" color="default" variant="soft">
                    <Tag className="mr-1 size-3" />
                    <Chip.Label>{tag}</Chip.Label>
                  </Chip>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-3 flex items-center gap-4 border-t border-black/[0.06] pt-2.5 text-xs text-foreground/50 dark:border-white/[0.08]">
            <span className="flex items-center gap-1">
              <Calendar className="size-3" />
              {new Date(instruction.created_at).toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1">
              <Comment className="size-3" />
              {instruction.linked_conversations} conversations
            </span>
            <span className="flex items-center gap-1">
              <Star className="size-3" />
              used {instruction.usage_count} times
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
