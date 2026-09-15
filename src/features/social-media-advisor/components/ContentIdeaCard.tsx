"use client";

import { Button, Chip } from "@heroui/react";
import { Bookmark, BookmarkFill, Check, Hashtag, TrashBin } from "@gravity-ui/icons";

import type { ContentIdeaRow } from "@/features/social-media-advisor/types";

export function ContentIdeaCard({
  idea,
  isSaved,
  isSaving,
  isDeleting,
  isTogglingStatus,
  onSave,
  onToggleStatus,
  onDelete,
}: {
  idea: ContentIdeaRow;
  isSaved: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  isTogglingStatus: boolean;
  onSave: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}) {
  const isDone = idea.status === "done";

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-black/[0.08] bg-card p-4 dark:border-white/[0.12]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{idea.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Chip size="sm" color="default" variant="soft">
              <Chip.Label className="capitalize">{idea.platform}</Chip.Label>
            </Chip>
            <Chip size="sm" color="default" variant="soft">
              <Chip.Label className="capitalize">{idea.format.replace("_", " ")}</Chip.Label>
            </Chip>
            <Chip size="sm" color={idea.impact_score >= 80 ? "success" : idea.impact_score >= 60 ? "warning" : "default"} variant="soft">
              <Chip.Label>{idea.impact_score} impact</Chip.Label>
            </Chip>
            {isDone ? (
              <Chip size="sm" color="success" variant="soft">
                <Chip.Label>Done</Chip.Label>
              </Chip>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            size="sm"
            variant="ghost"
            isIconOnly
            aria-label={isSaved ? "Saved" : "Save"}
            isDisabled={isSaving || isSaved}
            onPress={onSave}
          >
            {isSaved ? <BookmarkFill className="size-4 text-primary" /> : <Bookmark className="size-4" />}
          </Button>
          <Button size="sm" variant="ghost" isIconOnly aria-label={isDone ? "Mark active" : "Mark done"} isDisabled={isTogglingStatus} onPress={onToggleStatus}>
            <Check className={`size-4 ${isDone ? "text-foreground/40" : "text-success"}`} />
          </Button>
          <Button size="sm" variant="ghost" isIconOnly aria-label="Delete" isDisabled={isDeleting} onPress={onDelete}>
            <TrashBin className="size-4 text-danger" />
          </Button>
        </div>
      </div>

      <p className="text-sm text-foreground/70">{idea.description}</p>

      {idea.hashtags?.length ? (
        <div className="flex flex-wrap gap-1">
          {idea.hashtags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-0.5 text-xs text-primary">
              <Hashtag className="size-3" />
              {tag.replace(/^#/, "")}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
