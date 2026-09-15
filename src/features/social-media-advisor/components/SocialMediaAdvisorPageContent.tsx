"use client";

import { useState } from "react";
import { Button, Tabs, useOverlayState } from "@heroui/react";
import { Bookmark, MagicWand, Megaphone, Plus } from "@gravity-ui/icons";

import { useSessionStore } from "@/state/session-store";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ApiError } from "@/types/api";
import {
  useContentIdeasQuery,
  useDeleteContentIdeaMutation,
  useDeleteSavedContentIdeaMutation,
  useSaveContentIdeaMutation,
  useSavedContentIdeasQuery,
  useSetContentIdeaStatusMutation,
} from "@/features/social-media-advisor/hooks/useContentIdeas";
import { AdvisorChatPanel } from "@/features/social-media-advisor/components/AdvisorChatPanel";
import { ContentIdeaCard } from "@/features/social-media-advisor/components/ContentIdeaCard";
import { ContentIdeaFormModal } from "@/features/social-media-advisor/components/ContentIdeaFormModal";
import type { ContentIdeaRow } from "@/features/social-media-advisor/types";

function actionErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "You appear to be offline. Check your connection and try again.";
    if (error.isForbidden) return "You don't have permission to do that.";
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

function IdeasTab({ workspaceId }: { workspaceId: string }) {
  const ideasQuery = useContentIdeasQuery(workspaceId);
  const savedQuery = useSavedContentIdeasQuery(workspaceId);
  const saveMutation = useSaveContentIdeaMutation(workspaceId);
  const statusMutation = useSetContentIdeaStatusMutation(workspaceId);
  const deleteMutation = useDeleteContentIdeaMutation(workspaceId);
  const formState = useOverlayState();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (ideasQuery.isLoading) return <LoadingState label="Loading content ideas…" className="py-16" />;
  if (ideasQuery.isError) return <ErrorState error={ideasQuery.error} onRetry={() => ideasQuery.refetch()} className="py-16" />;

  const ideas = ideasQuery.data ?? [];
  const savedOriginalIds = new Set((savedQuery.data ?? []).map((s) => s.original_idea_id).filter(Boolean));

  async function handleSave(idea: ContentIdeaRow) {
    if (saveMutation.isPending) return; // guard double-submit
    setActionError(null);
    setBusyId(idea.id);
    try {
      await saveMutation.mutateAsync(idea);
    } catch (err) {
      setActionError(actionErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleStatus(idea: ContentIdeaRow) {
    if (statusMutation.isPending) return; // guard double-submit
    setActionError(null);
    setBusyId(idea.id);
    try {
      await statusMutation.mutateAsync({ id: idea.id, status: idea.status === "done" ? "active" : "done" });
    } catch (err) {
      setActionError(actionErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(idea: ContentIdeaRow) {
    if (deleteMutation.isPending) return; // guard double-submit
    if (!window.confirm(`Delete "${idea.title}"?`)) return;
    setActionError(null);
    setBusyId(idea.id);
    try {
      await deleteMutation.mutateAsync(idea.id);
    } catch (err) {
      setActionError(actionErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onPress={() => formState.open()}>
          <Plus className="size-3.5" />
          New idea
        </Button>
      </div>

      {actionError ? (
        <p role="alert" className="mb-3 text-sm text-danger">
          {actionError}
        </p>
      ) : null}

      {ideas.length === 0 ? (
        <EmptyState
          title="No content ideas yet"
          description="Ask the AI Advisor for inspiration, then add the best ones here."
          action={
            <Button size="sm" className="mt-2" onPress={() => formState.open()}>
              Add your first idea
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {ideas.map((idea) => (
            <ContentIdeaCard
              key={idea.id}
              idea={idea}
              isSaved={savedOriginalIds.has(idea.id)}
              isSaving={busyId === idea.id && saveMutation.isPending}
              isTogglingStatus={busyId === idea.id && statusMutation.isPending}
              isDeleting={busyId === idea.id && deleteMutation.isPending}
              onSave={() => void handleSave(idea)}
              onToggleStatus={() => void handleToggleStatus(idea)}
              onDelete={() => void handleDelete(idea)}
            />
          ))}
        </div>
      )}

      <ContentIdeaFormModal workspaceId={workspaceId} state={formState} />
    </div>
  );
}

function SavedTab({ workspaceId }: { workspaceId: string }) {
  const savedQuery = useSavedContentIdeasQuery(workspaceId);
  const deleteMutation = useDeleteSavedContentIdeaMutation(workspaceId);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (savedQuery.isLoading) return <LoadingState label="Loading saved ideas…" className="py-16" />;
  if (savedQuery.isError) return <ErrorState error={savedQuery.error} onRetry={() => savedQuery.refetch()} className="py-16" />;

  const saved = savedQuery.data ?? [];

  async function handleRemove(id: string, title: string) {
    if (deleteMutation.isPending) return; // guard double-submit
    if (!window.confirm(`Remove "${title}" from saved ideas?`)) return;
    setActionError(null);
    setBusyId(id);
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err) {
      setActionError(actionErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  if (saved.length === 0) {
    return <EmptyState title="No saved ideas yet" description="Bookmark ideas from the Content Ideas tab to find them here." />;
  }

  return (
    <div>
      {actionError ? (
        <p role="alert" className="mb-3 text-sm text-danger">
          {actionError}
        </p>
      ) : null}
      <ul className="divide-y divide-black/[0.06] overflow-hidden rounded-xl border border-black/[0.08] dark:divide-white/[0.08] dark:border-white/[0.12]">
        {saved.map((idea) => (
          <li key={idea.id} className="flex items-start gap-3 px-4 py-3.5">
            <Bookmark className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">{idea.title}</p>
              <p className="mt-0.5 line-clamp-2 text-sm text-foreground/70">{idea.description}</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              isDisabled={busyId === idea.id}
              onPress={() => void handleRemove(idea.id, idea.title)}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * `/social-media-advisor` — reference: old frontend's `pages/
 * SocialMediaAdvisor.tsx`. See `features/social-media-advisor/types.ts`
 * for the full backend trace, confirmed gap (conversation-analysis →
 * auto-generated ideas is not implemented server-side), and what's real
 * here instead: an AI Advisor chat, a manual Content Ideas manager, and a
 * per-user Saved Ideas list.
 */
export function SocialMediaAdvisorPageContent() {
  const workspaceId = useSessionStore((s) => s.workspaceId);

  if (!workspaceId) {
    return (
      <div className="p-6">
        <ErrorState error={new Error("No workspace selected")} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Social Media Advisor</h1>
        <p className="text-sm text-foreground/60">
          Ask the AI advisor for content ideas, then track and save the ones worth pursuing.
        </p>
      </div>

      <Tabs defaultSelectedKey="chat">
        <Tabs.List>
          <Tabs.Tab id="chat">
            <Megaphone className="mr-1.5 inline size-4" aria-hidden="true" />
            AI Advisor
          </Tabs.Tab>
          <Tabs.Tab id="ideas">
            <MagicWand className="mr-1.5 inline size-4" aria-hidden="true" />
            Content Ideas
          </Tabs.Tab>
          <Tabs.Tab id="saved">
            <Bookmark className="mr-1.5 inline size-4" aria-hidden="true" />
            Saved
          </Tabs.Tab>
        </Tabs.List>

        <div className="pt-4">
          <Tabs.Panel id="chat">
            <AdvisorChatPanel />
          </Tabs.Panel>
          <Tabs.Panel id="ideas">
            <IdeasTab workspaceId={workspaceId} />
          </Tabs.Panel>
          <Tabs.Panel id="saved">
            <SavedTab workspaceId={workspaceId} />
          </Tabs.Panel>
        </div>
      </Tabs>
    </div>
  );
}
