"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { User } from "@supabase/supabase-js";

import { useAnimationStore, useEditorStore } from "@/app/store";
import { decodeAnimationSharePayload } from "@/features/animation/share-utils";
import { trackAnimationEvent } from "@/features/animation/analytics";
import { AnimationSlide } from "@/types/animation";

type UseAnimationSharingProps = {
  user: User | null;
  slides: AnimationSlide[];
  isPlaying: boolean;
  handlePlayPause: (options?: { track?: boolean }) => void;
  handleReset: (options?: { track?: boolean }) => void;
  progress: number;
};

export function useAnimationSharing({
  user,
  slides,
  isPlaying,
  handlePlayPause,
  handleReset,
  progress,
}: UseAnimationSharingProps) {
  const searchParams = useSearchParams();
  const sharedFlag = searchParams.get("animation_shared");
  const sharedData = searchParams.get("animation");
  const isSharedView = sharedFlag === "true";

  const hasRestoredSharedState = useRef(false);
  const hasStartedSharedPlayback = useRef(false);
  const modeStartRef = useRef<number>(0);
  const lastModeRef = useRef<"edit" | "preview">(isSharedView ? "preview" : "edit");

  const [mode, setMode] = useState<"edit" | "preview">(
    () => (isSharedView ? "preview" : "edit")
  );

  const getTimestamp = () => new Date().getTime();

  useEffect(() => {
    if (modeStartRef.current === 0) {
      modeStartRef.current = getTimestamp();
    }
  }, []);

  // --- Restore State from Share Payload ---
  useEffect(() => {
    if (hasRestoredSharedState.current) return;
    if (!isSharedView || !sharedData) return;

    const payload = decodeAnimationSharePayload(sharedData);
    if (!payload) return;

    const sanitizedSlides = (payload.slides || []).map((slide, index) => ({
      id: slide.id || `shared-slide-${index + 1}`,
      code: slide.code || "",
      title: slide.title || `Slide ${index + 1}`,
      language: slide.language || "plaintext",
      autoDetectLanguage: slide.autoDetectLanguage ?? true,
      duration: typeof slide.duration === "number" ? slide.duration : 2,
    }));

    useAnimationStore.setState((state) => ({
      ...state,
      slides: sanitizedSlides.length ? sanitizedSlides : state.slides,
      activeSlideIndex: 0,
      animationSettings: payload.settings
        ? { ...state.animationSettings, ...payload.settings }
        : state.animationSettings,
      isPlaying: false,
      currentPlaybackTime: 0,
    }));

    useEditorStore.setState((state) => ({
      ...state,
      backgroundTheme: payload.editor?.backgroundTheme ?? state.backgroundTheme,
      fontFamily: payload.editor?.fontFamily ?? state.fontFamily,
      fontSize: payload.editor?.fontSize ?? state.fontSize,
      showBackground: payload.editor?.showBackground ?? state.showBackground,
      showLineNumbers: payload.editor?.showLineNumbers ?? state.showLineNumbers,
      editor: payload.editor?.editor ?? state.editor,
      presentational: true,
    }));

    hasRestoredSharedState.current = true;
  }, [sharedData, isSharedView]);

  // --- Enforce Presentational State ---
  useEffect(() => {
    // Ensure edit/preview mode is treated as non-presentational unless explicitly shared
    if (!isSharedView) {
      useEditorStore.setState((state) => ({
        ...state,
        presentational: false,
      }));
    }

    return () => {
      useEditorStore.setState((state) => ({
        ...state,
        presentational: false,
      }));
    };
  }, [isSharedView]);

  // --- Auto-play in Shared View ---
  useEffect(() => {
    if (!isSharedView) return;
    if (slides.length < 2) return;
    if (hasStartedSharedPlayback.current) return;

    // Small delay to ensure everything is mounted
    const timer = setTimeout(() => {
      hasStartedSharedPlayback.current = true;
      handleReset({ track: false });
      if (!isPlaying) {
        handlePlayPause({ track: false });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [handlePlayPause, handleReset, isPlaying, isSharedView, slides.length]);

  // --- Loop in Shared View ---
  useEffect(() => {
    if (!isSharedView) return;
    if (slides.length < 2) return;
    if (isPlaying) return;
    if (progress < 100) return;

    handleReset({ track: false });
    handlePlayPause({ track: false });
  }, [handlePlayPause, handleReset, isPlaying, isSharedView, progress, slides.length]);

  // --- Toggle Mode Logic ---
  const toggleMode = useCallback(() => {
    if (isSharedView) return; // Locked in shared view

    const newMode = mode === "edit" ? "preview" : "edit";
    const now = getTimestamp();
    const timeInPrevMode = now - modeStartRef.current;

    trackAnimationEvent("animation_mode_changed", user, {
      from_mode: mode,
      to_mode: newMode,
      slide_count: slides.length,
      time_in_previous_mode_ms: timeInPrevMode,
    });

    modeStartRef.current = now;
    lastModeRef.current = newMode;
    setMode(newMode);

    if (newMode === "edit") {
      if (isPlaying) handlePlayPause();
      handleReset();
    }
  }, [handlePlayPause, handleReset, isPlaying, isSharedView, mode, slides.length, user]);

  return {
    mode,
    isSharedView,
    toggleMode,
  };
}
