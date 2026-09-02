"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { getConversationAudioBlob } from "@/services/api/conversations";
import { ApiError } from "@/types/api";

export interface ConversationAudioMeta {
  title?: string;
  subtitle?: string;
}

interface GlobalAudioState {
  conversationId: string | null;
  title: string;
  subtitle: string;
  isLoading: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  progress: number;
  error: string | null;
}

interface GlobalAudioContextValue extends GlobalAudioState {
  isActive: boolean;
  playConversation: (conversationId: string, meta?: ConversationAudioMeta) => Promise<void>;
  dismiss: () => void;
  pause: () => void;
  resume: () => void;
  seekToPercent: (percent: number) => void;
  formatTime: (seconds: number) => string;
}

const GlobalAudioContext = createContext<GlobalAudioContextValue | null>(null);

const INITIAL: GlobalAudioState = {
  conversationId: null,
  title: "",
  subtitle: "",
  isLoading: false,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  progress: 0,
  error: null,
};

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function GlobalAudioProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GlobalAudioState>(INITIAL);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const loadTokenRef = useRef(0);

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const detachAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    audioRef.current = null;
  }, []);

  const dismiss = useCallback(() => {
    loadTokenRef.current += 1;
    detachAudio();
    revokeObjectUrl();
    setState(INITIAL);
  }, [detachAudio, revokeObjectUrl]);

  const patch = useCallback((updates: Partial<GlobalAudioState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const playConversation = useCallback(
    async (conversationId: string, meta?: ConversationAudioMeta) => {
      const token = ++loadTokenRef.current;
      detachAudio();
      revokeObjectUrl();

      patch({
        conversationId,
        title: meta?.title?.trim() || "Call recording",
        subtitle: meta?.subtitle?.trim() || "",
        isLoading: true,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        progress: 0,
        error: null,
      });

      try {
        const blob = await getConversationAudioBlob(conversationId);
        if (token !== loadTokenRef.current) return;

        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;
        audio.preload = "auto";

        const onLoaded = () => {
          if (token !== loadTokenRef.current) return;
          const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
          patch({ isLoading: false, duration });
        };
        const onTime = () => {
          if (token !== loadTokenRef.current) return;
          const currentTime = audio.currentTime;
          const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
          setState((prev) => ({
            ...prev,
            currentTime,
            duration: duration > 0 ? duration : prev.duration,
            progress: duration > 0 ? (currentTime / duration) * 100 : prev.progress,
            isPlaying: !audio.paused,
          }));
        };
        const onPlay = () => {
          if (token !== loadTokenRef.current) return;
          patch({ isPlaying: true, isLoading: false });
        };
        const onPause = () => {
          if (token !== loadTokenRef.current) return;
          patch({ isPlaying: false });
        };
        const onEnded = () => {
          if (token !== loadTokenRef.current) return;
          patch({ isPlaying: false, progress: 100, currentTime: audio.duration || 0 });
        };
        const onError = () => {
          if (token !== loadTokenRef.current) return;
          patch({
            isLoading: false,
            isPlaying: false,
            error: "Could not play this recording.",
          });
        };

        audio.addEventListener("loadedmetadata", onLoaded);
        audio.addEventListener("timeupdate", onTime);
        audio.addEventListener("play", onPlay);
        audio.addEventListener("pause", onPause);
        audio.addEventListener("ended", onEnded);
        audio.addEventListener("error", onError);

        await audio.play();
      } catch (err) {
        if (token !== loadTokenRef.current) return;
        const message =
          err instanceof ApiError && err.statusCode === 404
            ? "Recording file is missing on the server."
            : err instanceof ApiError
              ? err.message
              : "Could not load audio.";
        patch({ isLoading: false, isPlaying: false, error: message });
      }
    },
    [detachAudio, patch, revokeObjectUrl],
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    void audioRef.current?.play();
  }, []);

  const seekToPercent = useCallback((percent: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
    const clamped = Math.min(100, Math.max(0, percent));
    audio.currentTime = (clamped / 100) * audio.duration;
  }, []);

  useEffect(() => () => {
    loadTokenRef.current += 1;
    detachAudio();
    revokeObjectUrl();
  }, [detachAudio, revokeObjectUrl]);

  const value = useMemo<GlobalAudioContextValue>(
    () => ({
      ...state,
      isActive: Boolean(state.conversationId) || state.isLoading,
      playConversation,
      dismiss,
      pause,
      resume,
      seekToPercent,
      formatTime,
    }),
    [dismiss, pause, playConversation, resume, seekToPercent, state],
  );

  return <GlobalAudioContext.Provider value={value}>{children}</GlobalAudioContext.Provider>;
}

export function useGlobalAudio() {
  const ctx = useContext(GlobalAudioContext);
  if (!ctx) {
    throw new Error("useGlobalAudio must be used within GlobalAudioProvider");
  }
  return ctx;
}
