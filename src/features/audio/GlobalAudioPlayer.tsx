"use client";

import { Button, Spinner } from "@heroui/react";
import { Grip, Pause, Play, Volume, Xmark } from "@gravity-ui/icons";

import { useGlobalAudio } from "@/features/audio/GlobalAudioProvider";
import { useDraggableFixedPosition } from "@/hooks/useDraggableFixedPosition";

const PANEL_WIDTH = 320;
const PANEL_HEIGHT = 168;
const MARGIN = 16;
const MOBILE_NAV_OFFSET = 56;

function defaultPosition() {
  const mobile = typeof window !== "undefined" && window.innerWidth < 768;
  return {
    x: window.innerWidth - PANEL_WIDTH - MARGIN,
    y: window.innerHeight - PANEL_HEIGHT - MARGIN - (mobile ? MOBILE_NAV_OFFSET : 0),
  };
}

/** Floating PiP player — persists across route changes until dismissed. */
export function GlobalAudioPlayer() {
  const {
    isActive,
    title,
    subtitle,
    isLoading,
    isPlaying,
    currentTime,
    duration,
    progress,
    error,
    dismiss,
    pause,
    resume,
    seekToPercent,
    formatTime,
  } = useGlobalAudio();

  const { position, setPosition, isDragging, bindDragSurface } = useDraggableFixedPosition({
    storageKey: "operatora.global-audio-player-pos",
    width: PANEL_WIDTH,
    height: PANEL_HEIGHT,
    margin: MARGIN,
    getDefault: defaultPosition,
  });

  if (!isActive) return null;

  const dragHandleProps = bindDragSurface((x, y) => setPosition({ x, y }), {
    width: PANEL_WIDTH,
    height: PANEL_HEIGHT,
    getOrigin: () => position,
  });

  return (
    <div
      data-testid="global-audio-player"
      className="pointer-events-auto"
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        width: PANEL_WIDTH,
        zIndex: 60,
        touchAction: isDragging ? "none" : undefined,
      }}
    >
      <div className="rounded-2xl border border-black/[0.08] bg-background/95 p-4 shadow-xl backdrop-blur-md dark:border-white/[0.12]">
        <div className="mb-3 flex items-center justify-between gap-2" {...dragHandleProps}>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Grip className="size-3.5 shrink-0 text-foreground/35" aria-hidden="true" />
            <Volume className="size-4 shrink-0 text-accent" aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{title}</p>
              {subtitle ? <p className="truncate text-xs text-foreground/50">{subtitle}</p> : null}
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-foreground/45 hover:bg-[var(--default)] hover:text-foreground"
            aria-label="Close player"
          >
            <Xmark className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            className="group h-2 w-full cursor-pointer rounded-full bg-black/[0.08] dark:bg-white/[0.1]"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = ((e.clientX - rect.left) / rect.width) * 100;
              seekToPercent(pct);
            }}
            aria-label="Seek"
          >
            <div
              className="h-full rounded-full bg-accent transition-all group-hover:bg-accent/80"
              style={{ width: `${progress}%` }}
            />
          </button>
          <div className="flex items-center justify-between text-xs text-foreground/45">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center">
          <Button
            size="sm"
            variant="secondary"
            isDisabled={isLoading || Boolean(error)}
            onPress={isPlaying ? pause : resume}
          >
            {isLoading ? (
              <Spinner size="sm" aria-label="Loading audio" />
            ) : isPlaying ? (
              <Pause className="size-4" aria-hidden="true" />
            ) : (
              <Play className="size-4" aria-hidden="true" />
            )}
            <span className="ml-2">{isLoading ? "Loading…" : isPlaying ? "Pause" : "Resume"}</span>
          </Button>
        </div>

        {error ? (
          <p role="alert" className="mt-2 text-center text-xs text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
