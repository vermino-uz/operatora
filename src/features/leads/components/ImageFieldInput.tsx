"use client";

import { useRef, useState } from "react";
import { Button, Spinner } from "@heroui/react";
import { Picture, Xmark } from "@gravity-ui/icons";

import { coerceImageUrls } from "@/features/leads/customFieldTypes";
import { leadCustomFieldsApi } from "@/services/api/leadCustomFields";
import { PhotoLightbox, type PhotoLightboxItem } from "@/features/messages/components/PhotoLightbox";

function toLightboxItems(urls: string[]): PhotoLightboxItem[] {
  return urls.map((url, index) => ({ id: String(index), url }));
}

/** Read-only thumbnails; click any image to open a full-size lightbox. */
export function ImageFieldThumbnails({
  value,
  size = "sm",
  maxVisible = 4,
  className = "",
  stopClickPropagation = false,
}: {
  value: unknown;
  size?: "sm" | "md";
  maxVisible?: number;
  className?: string;
  stopClickPropagation?: boolean;
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const urls = coerceImageUrls(value) ?? [];
  if (urls.length === 0) return null;

  const thumbClass = size === "md" ? "size-16" : "size-8";
  const items = toLightboxItems(urls);

  function openAt(e: React.MouseEvent, index: number) {
    if (stopClickPropagation) {
      e.stopPropagation();
      e.preventDefault();
    }
    setLightboxIndex(index);
  }

  return (
    <>
      <span className={`inline-flex flex-wrap gap-1 ${className}`}>
        {urls.slice(0, maxVisible).map((url, index) => (
          <button
            key={`${url}-${index}`}
            type="button"
            onClick={(e) => openAt(e, index)}
            onPointerDown={(e) => stopClickPropagation && e.stopPropagation()}
            className={`overflow-hidden rounded border border-black/[0.08] p-0 transition-shadow hover:ring-2 hover:ring-accent/30 dark:border-white/[0.12] ${thumbClass}`}
            aria-label="Preview image"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- custom-field public URLs */}
            <img src={url} alt="" className="size-full object-cover" />
          </button>
        ))}
        {urls.length > maxVisible ? (
          <button
            type="button"
            onClick={(e) => openAt(e, maxVisible)}
            onPointerDown={(e) => stopClickPropagation && e.stopPropagation()}
            className={`inline-flex min-w-8 items-center justify-center rounded border border-black/[0.08] px-1 text-xs text-foreground/50 hover:bg-[var(--default)] dark:border-white/[0.12] ${thumbClass}`}
            aria-label={`Preview ${urls.length - maxVisible} more images`}
          >
            +{urls.length - maxVisible}
          </button>
        ) : null}
      </span>
      {lightboxIndex != null ? (
        <PhotoLightbox items={items} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      ) : null}
    </>
  );
}

/** Upload control for `image`-type custom fields — stores public URLs as `string[]`. */
export function ImageFieldInput({
  value,
  onChange,
  disabled,
}: {
  value: unknown;
  onChange: (next: string[] | null) => void;
  disabled?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const urls = coerceImageUrls(value) ?? [];

  async function handleFiles(fileList: FileList | null | undefined) {
    const files = fileList ? Array.from(fileList) : [];
    if (files.length === 0) return;

    setUploading(true);
    setError(null);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const { publicUrl } = await leadCustomFieldsApi.uploadImage(file);
        uploaded.push(publicUrl);
      }
      onChange([...urls, ...uploaded]);
    } catch {
      setError("Image upload failed. Try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeAt(index: number) {
    const next = urls.filter((_, i) => i !== index);
    onChange(next.length ? next : null);
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        disabled={disabled || uploading}
        onChange={(e) => void handleFiles(e.target.files)}
      />
      {urls.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {urls.map((url, index) => (
            <div key={`${url}-${index}`} className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- custom-field public URLs */}
              <img
                src={url}
                alt=""
                className="size-16 rounded border border-black/[0.08] object-cover dark:border-white/[0.12]"
              />
              {!disabled ? (
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  className="absolute -right-1.5 -top-1.5 inline-flex size-5 items-center justify-center rounded-full border border-black/[0.08] bg-background text-foreground/50 opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground dark:border-white/[0.12]"
                  aria-label="Remove image"
                >
                  <Xmark className="size-3" aria-hidden="true" />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex size-16 items-center justify-center rounded border border-dashed border-black/[0.12] text-foreground/30 dark:border-white/[0.16]">
          <Picture className="size-5" aria-hidden="true" />
        </div>
      )}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="self-start"
        onPress={() => inputRef.current?.click()}
        isDisabled={disabled || uploading}
      >
        {uploading ? <Spinner size="sm" aria-label="Uploading" /> : null}
        {urls.length ? "Add images" : "Upload"}
      </Button>
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
