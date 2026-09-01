"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Xmark } from "@gravity-ui/icons";

export interface PhotoLightboxItem {
  id: string;
  url: string;
  caption?: string;
}

export interface PhotoLightboxProps {
  items: PhotoLightboxItem[];
  initialIndex: number;
  onClose: () => void;
}

/** Full-screen photo viewer — click a chat photo thumbnail to open. */
export function PhotoLightbox({ items, initialIndex, onClose }: PhotoLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  const goPrev = useCallback(() => {
    setIndex((i) => (i > 0 ? i - 1 : items.length - 1));
  }, [items.length]);

  const goNext = useCallback(() => {
    setIndex((i) => (i < items.length - 1 ? i + 1 : 0));
  }, [items.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        e.stopPropagation();
        goPrev();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        e.stopPropagation();
        goNext();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose, goPrev, goNext]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (!items.length || index < 0 || index >= items.length) return null;

  const current = items[index];
  const hasMultiple = items.length > 1;

  return createPortal(
    <div
      ref={containerRef}
      tabIndex={-1}
      className="pointer-events-auto fixed inset-0 z-[250] flex flex-col bg-black/90 outline-none"
      role="dialog"
      aria-modal="true"
      aria-label="Photo preview"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div className="flex shrink-0 items-center justify-between px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <span className="text-[13px] font-medium tabular-nums text-white/80">
          {index + 1} / {items.length}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="flex size-10 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
          aria-label="Close preview"
        >
          <Xmark className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-14 py-4"
        onClick={(e) => e.stopPropagation()}
      >
        {hasMultiple ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            className="absolute left-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
            aria-label="Previous photo"
          >
            <ChevronLeft className="size-6" aria-hidden="true" />
          </button>
        ) : null}

        {/* eslint-disable-next-line @next/next/no-img-element -- full-size proxied Telegram stream */}
        <img
          src={current.url}
          alt={current.caption || "Photo"}
          className="max-h-full max-w-full select-none object-contain"
          draggable={false}
        />

        {hasMultiple ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            className="absolute right-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
            aria-label="Next photo"
          >
            <ChevronRight className="size-6" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {current.caption ? (
        <p
          className="mx-auto max-w-2xl px-6 pb-5 pt-2 text-center text-[13px] text-white/85"
          onClick={(e) => e.stopPropagation()}
        >
          {current.caption}
        </p>
      ) : null}
    </div>,
    document.body,
  );
}
