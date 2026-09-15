"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Modal, TextArea, useOverlayState } from "@heroui/react";
import {
  ArrowDownToLine,
  ArrowRotateLeft,
  ArrowUpFromSquare,
  Check,
  Hashtag,
  TextAlignLeft,
  TrashBin,
  Xmark,
} from "@gravity-ui/icons";

import { useSessionStore } from "@/state/session-store";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { FileValidationError } from "@/services/api/uploadFile";
import { isPlanLimitError } from "@/services/api/generatedMedia";
import {
  useCatalogizeMediaMutation,
  useDeleteGeneratedMediaMutation,
  useEditMediaMutation,
  useGeneratedMediaQuery,
  useGeneratedMediaQuotaQuery,
  useInstagramVariantsMutation,
  useRegenerateMediaMutation,
  useUploadSourceMediaMutation,
} from "@/features/gallery/hooks/useGeneratedMedia";
import type {
  GalleryKindFilter,
  GallerySourceFilter,
  GeneratedMediaItem,
  InstagramVariant,
} from "@/features/gallery/types";

const SOURCE_FILTERS: { key: GallerySourceFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "upload", label: "Uploaded" },
  { key: "chat", label: "AI Chat" },
  { key: "higgsfield", label: "Higgsfield" },
];
const KIND_FILTERS: { key: GalleryKindFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "image", label: "Images" },
  { key: "video", label: "Video" },
];
const MAX_SELECT = 10;
const MAX_UPLOAD_BATCH = 10;

function selectable(item: GeneratedMediaItem): boolean {
  return item.source !== "higgsfield" && item.kind === "image";
}

function uploadErrorMessage(error: unknown): string {
  if (error instanceof FileValidationError) return error.message;
  if (isPlanLimitError(error)) return "Image generation isn't available on your current plan.";
  return "Couldn't upload this file. Please try again.";
}

/**
 * `/gallery` — grid browser over the `generated-media` bucket, backed by
 * the real dedicated `generated-media` REST controller (list/upload/
 * delete/regenerate/quota/catalogize/edit/instagram-variants — see
 * `features/gallery/types.ts` doc comment). Reference: old frontend's
 * `pages/Gallery.tsx`. No page-level permission gate — the old route wraps
 * it in a bare `<ProtectedRoute>` (auth only), and the sidebar hides this
 * entry deliberately (opened from AI Chat instead), matching
 * `constants/sitemap.ts`.
 */
export function GalleryPageContent() {
  const workspaceId = useSessionStore((s) => s.workspaceId);
  const [source, setSource] = useState<GallerySourceFilter>("all");
  const [kind, setKind] = useState<GalleryKindFilter>("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [preview, setPreview] = useState<GeneratedMediaItem | null>(null);
  const [promptFor, setPromptFor] = useState<GeneratedMediaItem | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectMaxNotice, setSelectMaxNotice] = useState(false);

  const mediaQuery = useGeneratedMediaQuery(workspaceId, { source, kind });
  const quotaQuery = useGeneratedMediaQuotaQuery(workspaceId);
  const uploadMutation = useUploadSourceMediaMutation(workspaceId);
  const deleteMutation = useDeleteGeneratedMediaMutation(workspaceId);
  const regenerateMutation = useRegenerateMediaMutation(workspaceId);
  const catalogizeMutation = useCatalogizeMediaMutation(workspaceId);
  const editMutation = useEditMediaMutation(workspaceId);
  const instagramMutation = useInstagramVariantsMutation(workspaceId);

  const editState = useOverlayState();
  const igState = useOverlayState();
  const [editText, setEditText] = useState("");
  const [igTopic, setIgTopic] = useState("");
  const [igVariants, setIgVariants] = useState<InstagramVariant[] | null>(null);
  const [igPublishEnabled, setIgPublishEnabled] = useState(false);
  const [igError, setIgError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const items = mediaQuery.data ?? [];
  const batchBusy = uploadMutation.isPending || catalogizeMutation.isPending || editMutation.isPending;

  // Derived (not stored) — never act on a selection id that scrolled out of
  // the currently-visible/filtered list. Computed at render time instead of
  // pruning `selected` state in an effect (avoids a redundant extra render
  // pass on every list change).
  const visibleSelectableIds = new Set(items.filter(selectable).map((i) => i.id));
  const effectiveSelected = selected.filter((id) => visibleSelectableIds.has(id));

  function toggleSelect(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_SELECT) {
        setSelectMaxNotice(true);
        setTimeout(() => setSelectMaxNotice(false), 2500);
        return prev;
      }
      return [...prev, id];
    });
  }

  async function handleUploadFiles(files: FileList | null) {
    if (!files?.length || uploadMutation.isPending) return;
    setUploadError(null);
    const list = Array.from(files).slice(0, MAX_UPLOAD_BATCH);
    let failures = 0;
    for (const file of list) {
      try {
        await uploadMutation.mutateAsync(file);
      } catch (err) {
        failures += 1;
        setUploadError(uploadErrorMessage(err));
      }
    }
    if (failures === 0) setUploadError(null);
  }

  async function handleDelete(item: GeneratedMediaItem) {
    if (deleteMutation.isPending) return;
    if (!window.confirm("Delete this media item? This cannot be undone.")) return;
    setActionError(null);
    try {
      await deleteMutation.mutateAsync(item.id);
      setSelected((prev) => prev.filter((id) => id !== item.id));
    } catch {
      setActionError("Couldn't delete this item. Please try again.");
    }
  }

  async function handleRegenerate(item: GeneratedMediaItem) {
    setActionError(null);
    try {
      await regenerateMutation.mutateAsync(item);
    } catch (err) {
      setActionError(isPlanLimitError(err) ? "Image generation quota reached for this plan." : "Couldn't regenerate this image.");
    }
  }

  async function handleCatalogize() {
    if (effectiveSelected.length === 0 || batchBusy) return;
    setActionError(null);
    try {
      const res = await catalogizeMutation.mutateAsync(effectiveSelected);
      setSelected([]);
      if (res.failed.length > 0) setActionError(`${res.failed.length} item(s) couldn't be converted to catalog images.`);
    } catch (err) {
      setActionError(isPlanLimitError(err) ? "Image generation quota reached for this plan." : "Couldn't create catalog images.");
    }
  }

  async function handleBatchEdit() {
    const instruction = editText.trim();
    if (effectiveSelected.length === 0 || !instruction || batchBusy) return;
    setActionError(null);
    editState.close();
    try {
      const res = await editMutation.mutateAsync({ mediaIds: effectiveSelected, instruction });
      setSelected([]);
      setEditText("");
      if (res.failed.length > 0) setActionError(`${res.failed.length} item(s) couldn't be edited.`);
    } catch (err) {
      setActionError(isPlanLimitError(err) ? "Image generation quota reached for this plan." : "Couldn't apply that edit.");
    }
  }

  async function handleInstagramVariants() {
    const topic = igTopic.trim();
    if (!topic || instagramMutation.isPending) return;
    setIgError(null);
    setIgVariants(null);
    try {
      const res = await instagramMutation.mutateAsync({ topic, count: 3 });
      setIgVariants(res.variants);
      setIgPublishEnabled(res.publishEnabled);
    } catch {
      setIgError("Couldn't generate caption variants. Please try again.");
    }
  }

  const quota = quotaQuery.data;

  if (!workspaceId) {
    return (
      <div className="p-6">
        <ErrorState error={new Error("No workspace selected")} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gallery</h1>
          <p className="text-sm text-foreground/60">
            Every image generated in AI Chat, plus anything you upload here, in one place.
            {quota ? (
              <span className="ml-1 text-foreground/50">
                {quota.disabled
                  ? "Image generation isn't available on your plan."
                  : quota.limit === null
                    ? `${quota.used} generated this month.`
                    : `${quota.used}/${quota.limit} generations used this month.`}
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" isDisabled={uploadMutation.isPending} onPress={() => fileInputRef.current?.click()}>
            <ArrowUpFromSquare className="size-3.5" />
            {uploadMutation.isPending ? "Uploading…" : "Upload photos"}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onPress={() => {
              setIgVariants(null);
              setIgError(null);
              igState.open();
            }}
          >
            <Hashtag className="size-3.5" />
            Instagram captions
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            void handleUploadFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {SOURCE_FILTERS.map((f) => (
          <Button key={f.key} size="sm" variant={source === f.key ? "primary" : "secondary"} onPress={() => setSource(f.key)}>
            {f.label}
          </Button>
        ))}
        <span className="mx-1 h-4 w-px bg-black/10 dark:bg-white/15" aria-hidden="true" />
        {KIND_FILTERS.map((f) => (
          <Button key={f.key} size="sm" variant={kind === f.key ? "primary" : "secondary"} onPress={() => setKind(f.key)}>
            {f.label}
          </Button>
        ))}
      </div>

      {uploadError ? (
        <p role="alert" className="text-sm text-danger">
          {uploadError}
        </p>
      ) : null}
      {actionError ? (
        <p role="alert" className="text-sm text-danger">
          {actionError}
        </p>
      ) : null}

      {mediaQuery.isLoading ? (
        <LoadingState label="Loading gallery…" className="py-16" />
      ) : mediaQuery.isError ? (
        <ErrorState error={mediaQuery.error} onRetry={() => mediaQuery.refetch()} className="py-16" />
      ) : items.length === 0 ? (
        <EmptyState
          title="No media yet"
          description="Images you generate in AI Chat or upload here will show up in this gallery."
        />
      ) : (
        <>
          {effectiveSelected.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-black/[0.08] bg-foreground/5 px-3 py-2 dark:border-white/[0.12]">
              <span className="text-sm text-foreground/70">{effectiveSelected.length} selected</span>
              <Button size="sm" variant="primary" isDisabled={batchBusy} onPress={() => void handleCatalogize()}>
                {catalogizeMutation.isPending ? "Working…" : "Make catalog images"}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                isDisabled={batchBusy}
                onPress={() => {
                  setEditText("");
                  editState.open();
                }}
              >
                Batch edit
              </Button>
              {selectMaxNotice ? <span className="text-xs text-danger">Up to {MAX_SELECT} at a time</span> : null}
              <button type="button" onClick={() => setSelected([])} className="ml-auto text-xs text-foreground/50 hover:text-foreground">
                Clear selection
              </button>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <GalleryTile
                key={item.id}
                item={item}
                isSelected={effectiveSelected.includes(item.id)}
                onToggleSelect={() => toggleSelect(item.id)}
                onPreview={() => setPreview(item)}
                onShowPrompt={() => setPromptFor(item)}
                onDelete={() => void handleDelete(item)}
                onRegenerate={() => void handleRegenerate(item)}
                isRegenerating={regenerateMutation.isPending}
              />
            ))}
          </div>
        </>
      )}

      {preview ? <PreviewLightbox item={preview} onClose={() => setPreview(null)} /> : null}

      <Modal isOpen={!!promptFor} onOpenChange={(open) => !open && setPromptFor(null)}>
        <Modal.Backdrop>
          <Modal.Container size="md">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Prompt</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="whitespace-pre-wrap text-sm text-foreground/80">{promptFor?.prompt || "No prompt recorded."}</p>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onPress={() => setPromptFor(null)}>
                  Close
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal isOpen={editState.isOpen} onOpenChange={(open) => (open ? editState.open() : editState.close())}>
        <Modal.Backdrop>
          <Modal.Container size="md">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Batch edit {effectiveSelected.length} item(s)</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <TextArea
                  rows={3}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  placeholder="Describe the edit — e.g. put these on a white background"
                />
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onPress={editState.close}>
                  Cancel
                </Button>
                <Button variant="primary" isDisabled={!editText.trim() || batchBusy} onPress={() => void handleBatchEdit()}>
                  {editMutation.isPending ? "Applying…" : "Apply"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal isOpen={igState.isOpen} onOpenChange={(open) => (open ? igState.open() : igState.close())}>
        <Modal.Backdrop>
          <Modal.Container size="lg">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Instagram caption variants</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={igTopic}
                    onChange={(e) => setIgTopic(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void handleInstagramVariants()}
                    placeholder="What's the post about?"
                    className="h-9 flex-1 rounded-lg border border-black/[0.12] bg-transparent px-3 text-sm outline-none focus:border-primary dark:border-white/[0.16]"
                  />
                  <Button
                    variant="primary"
                    isDisabled={!igTopic.trim() || instagramMutation.isPending}
                    onPress={() => void handleInstagramVariants()}
                  >
                    {instagramMutation.isPending ? "Generating…" : "Generate"}
                  </Button>
                </div>
                {igError ? <p className="text-sm text-danger">{igError}</p> : null}
                {igVariants ? (
                  <div className="flex flex-col gap-2">
                    {igVariants.map((v, i) => (
                      <div key={i} className="rounded-lg border border-black/[0.08] p-3 text-sm dark:border-white/[0.12]">
                        <p className="whitespace-pre-wrap">{v.caption}</p>
                        {v.hashtags.length > 0 ? <p className="mt-1.5 text-foreground/50">{v.hashtags.join(" ")}</p> : null}
                        <button
                          type="button"
                          onClick={() => void navigator.clipboard?.writeText(`${v.caption}\n\n${v.hashtags.join(" ")}`.trim())}
                          className="mt-2 rounded-lg bg-foreground/10 px-2 py-1 text-xs font-medium hover:bg-foreground/15"
                        >
                          Copy
                        </button>
                      </div>
                    ))}
                    {!igPublishEnabled ? (
                      <p className="border-t border-black/[0.08] pt-2 text-xs text-foreground/50 dark:border-white/[0.12]">
                        Publishing directly to Instagram isn&apos;t connected — copy and post manually.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onPress={igState.close}>
                  Close
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}

function GalleryTile({
  item,
  isSelected,
  onToggleSelect,
  onPreview,
  onShowPrompt,
  onDelete,
  onRegenerate,
  isRegenerating,
}: {
  item: GeneratedMediaItem;
  isSelected: boolean;
  onToggleSelect: () => void;
  onPreview: () => void;
  onShowPrompt: () => void;
  onDelete: () => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-black/[0.08] bg-foreground/5 dark:border-white/[0.12]">
      <button type="button" onClick={onPreview} className="block aspect-square w-full">
        {item.url && item.kind === "video" ? (
          <video src={item.url} muted playsInline className="h-full w-full object-cover" />
        ) : item.url ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed/external storage URL, not a static local asset
          <img src={item.url} alt={item.prompt.slice(0, 60)} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-foreground/40">No preview</div>
        )}
      </button>

      {selectable(item) ? (
        <button
          type="button"
          aria-label="Select"
          aria-pressed={isSelected}
          onClick={onToggleSelect}
          className={`absolute top-2 right-2 flex size-6 items-center justify-center rounded-md border transition-colors ${
            isSelected ? "border-primary bg-primary text-primary-foreground" : "border-white/40 bg-black/40 text-transparent hover:text-white/70"
          }`}
        >
          <Check className="size-3.5" />
        </button>
      ) : null}

      <div className="absolute top-2 left-2 flex gap-1">
        <span className="rounded bg-black/50 px-1.5 py-0.5 text-[10.5px] text-white capitalize">{item.source}</span>
        {item.kind === "video" ? <span className="rounded bg-black/50 px-1.5 py-0.5 text-[10.5px] text-white">Video</span> : null}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
        {item.url ? (
          <a
            href={item.url}
            download={item.source === "higgsfield" ? undefined : true}
            target={item.source === "higgsfield" ? "_blank" : undefined}
            rel="noreferrer"
            title="Download"
            className="flex size-7 items-center justify-center rounded-lg bg-white/90 text-black hover:bg-white"
          >
            <ArrowDownToLine className="size-3.5" />
          </a>
        ) : null}
        {item.source === "chat" && item.kind === "image" ? (
          <button
            type="button"
            disabled={isRegenerating}
            onClick={onRegenerate}
            title="Regenerate"
            className="flex size-7 items-center justify-center rounded-lg bg-white/90 text-black hover:bg-white disabled:opacity-50"
          >
            <ArrowRotateLeft className="size-3.5" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={onShowPrompt}
          title="Show prompt"
          className="flex size-7 items-center justify-center rounded-lg bg-white/90 text-black hover:bg-white"
        >
          <TextAlignLeft className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          title="Delete"
          className="ml-auto flex size-7 items-center justify-center rounded-lg bg-white/90 text-danger hover:bg-white"
        >
          <TrashBin className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function PreviewLightbox({ item, onClose }: { item: GeneratedMediaItem; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        <Xmark className="size-[18px]" />
      </button>
      <div className="max-h-[85vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
        {item.kind === "video" && item.url ? (
          <video src={item.url} controls autoPlay className="max-h-[85vh] max-w-full rounded-xl" />
        ) : item.url ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed/external storage URL, not a static local asset
          <img src={item.url} alt={item.prompt.slice(0, 60)} className="max-h-[85vh] max-w-full rounded-xl object-contain" />
        ) : null}
      </div>
    </div>
  );
}
