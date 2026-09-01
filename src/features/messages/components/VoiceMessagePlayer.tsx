"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "@gravity-ui/icons";

function formatTime(secs: number): string {
  if (!Number.isFinite(secs) || secs < 0) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export interface VoiceMessagePlayerProps {
  src: string;
  direction: "inbound" | "outbound";
}

/** Compact inline player for Telegram voice / audio notes. */
export function VoiceMessagePlayer({ src, direction }: VoiceMessagePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onEnd = () => {
      audio.currentTime = 0;
      setPlaying(false);
      setCurrentTime(0);
    };
    const onPause = () => setPlaying(false);
    const onPlay = () => setPlaying(true);

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("durationchange", onMeta);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("play", onPlay);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("durationchange", onMeta);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("play", onPlay);
    };
  }, [src]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play();
    else audio.pause();
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
    setCurrentTime(audio.currentTime);
  };

  const isOutbound = direction === "outbound";
  const progress = duration ? (currentTime / duration) * 100 : 0;
  const displayTime = playing || currentTime > 0 ? currentTime : duration;

  return (
    <div className="flex w-[min(240px,100%)] items-center gap-2.5 py-0.5">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause" : "Play"}
        className={`flex size-9 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-90 ${
          isOutbound ? "bg-black/15 text-accent-foreground" : "bg-accent text-accent-foreground"
        }`}
      >
        {playing ? <Pause className="size-4" aria-hidden="true" /> : <Play className="ml-0.5 size-4" aria-hidden="true" />}
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div
          onClick={seek}
          className={`relative h-1 cursor-pointer rounded-full ${isOutbound ? "bg-black/15" : "bg-foreground/15"}`}
        >
          <div
            className={`h-full rounded-full ${isOutbound ? "bg-accent-foreground/80" : "bg-accent"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className={`text-[11px] tabular-nums ${isOutbound ? "text-accent-foreground/70" : "text-foreground/50"}`}>
          {formatTime(displayTime)}
        </span>
      </div>
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
    </div>
  );
}
