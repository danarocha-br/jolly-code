"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/react-query/query-client";
import {
  UnifiedAnimationCanvas,
  useAnimationController,
  calculateTotalDuration,
} from "@/features/animation";
import { useAnimationStore, useEditorStore } from "@/app/store";
import { themes } from "@/lib/themes-options";
import { fonts } from "@/lib/fonts-options";
import { AnimationSharePayload } from "@/features/animation/share-utils";
import { trackAnimationEvent } from "@/features/animation/analytics";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import { useWatermarkVisibility } from "@/features/animation/hooks/use-watermark-visibility";

export type AnimateEmbedClientProps = {
  payload: AnimationSharePayload;
  slug: string;
};

const AnimateEmbedClient = ({ payload, slug }: AnimateEmbedClientProps) => {
  const [isReady] = useState(true);
  const previewRef = useRef<HTMLDivElement>(null);
  const hasStartedPlayback = useRef(false);
  const hasTrackedView = useRef(false);
  const isLoopingRef = useRef(false);
  const queryClient = getQueryClient();

  const {
    currentFrame,
    progress,
    isPlaying,
    handlePlayPause,
    handleReset,
    slides,
  } = useAnimationController();

  const backgroundTheme = useEditorStore((state) => state.backgroundTheme);
  const fontFamily = useEditorStore((state) => state.fontFamily);

  // Check if watermark should be shown
  // Note: For embed view, we need to get the owner's user ID from the payload or slug
  // For now, we'll show watermark by default for embeds (can be enhanced later to fetch owner preference)
  const { shouldShowWatermark } = useWatermarkVisibility();

  // Determine if background is dark for watermark color
  const isDarkBackground = [
    "sublime",
    "hyper",
    "dracula",
    "monokai",
    "nord",
    "gotham",
    "blue",
    "night-owl",
    "nightOwl", // Backward compatibility
  ].includes(backgroundTheme);

  // Start with a clean store state for the embed
  const sanitizedSlides = useMemo(
    () =>
      (payload.slides || []).map((slide, index) => ({
        id: slide.id || `embed-slide-${index + 1}`,
        code: slide.code || "",
        title: slide.title || `Slide ${index + 1}`,
        language: slide.language || "plaintext",
        autoDetectLanguage: slide.autoDetectLanguage ?? true,
        duration: typeof slide.duration === "number" ? slide.duration : 2,
      })),
    [payload.slides]
  );

  const totalDuration = useMemo(
    () => calculateTotalDuration(sanitizedSlides),
    [sanitizedSlides]
  );

  useEffect(() => {
    // Initialize stores
    useAnimationStore.setState((state) => ({
      ...state,
      slides: sanitizedSlides,
      activeSlideIndex: 0,
      animationSettings: payload.settings
        ? { ...state.animationSettings, ...payload.settings }
        : state.animationSettings,
      isPlaying: false, // Don't auto-play immediately to avoid audio policy issues or jarring starts
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

    return () => {
      useEditorStore.setState((state) => ({
        ...state,
        presentational: false,
      }));
    };
  }, [payload, sanitizedSlides]);

  // Track view
  useEffect(() => {
    if (hasTrackedView.current) return;
    hasTrackedView.current = true;
    trackAnimationEvent("embed_animation_viewed", null, {
      slug,
      slide_count: sanitizedSlides.length,
      total_duration: totalDuration,
    });
  }, [sanitizedSlides.length, slug, totalDuration]);

  // Auto-play logic
  useEffect(() => {
    if (!isReady) return;
    if (slides.length < 2) return;
    if (hasStartedPlayback.current) return;

    // Small delay to ensure everything rendered
    const timer = setTimeout(() => {
      hasStartedPlayback.current = true;
      handleReset({ track: false });
      if (!isPlaying) {
        handlePlayPause({ track: false });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [handlePlayPause, handleReset, isPlaying, isReady, slides.length]);

  // Loop animation when it completes
  useEffect(() => {
    if (!isReady) return;
    if (!hasStartedPlayback.current) return;
    if (isLoopingRef.current) return;

    // Check if animation has completed (progress >= 100 and not playing)
    if (progress >= 100 && !isPlaying) {
      // Set guard before scheduling timeout to prevent re-entry
      isLoopingRef.current = true;
      
      // Small delay before restarting for smooth transition
      const timer = setTimeout(() => {
        handleReset({ track: false });
        handlePlayPause({ track: false });
        // Reset guard after play begins
        isLoopingRef.current = false;
      }, 300);

      return () => {
        clearTimeout(timer);
        // Reset guard on cleanup
        isLoopingRef.current = false;
      };
    }
  }, [progress, isPlaying, isReady]);

  const handleReplay = () => {
    handleReset({ track: true });
    handlePlayPause({ track: true });
  };

  const handleOpenOriginal = () => {
    window.open(
      `https://jollycode.dev/animate/shared/${slug}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  if (!isReady) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <link
        rel="stylesheet"
        href={themes[backgroundTheme].theme}
        crossOrigin="anonymous"
      />
      <link
        rel="stylesheet"
        href={fonts[fontFamily].src}
        crossOrigin="anonymous"
      />

      <div className="relative w-full h-screen overflow-hidden flex items-center justify-center bg-background">
        {/* Aggressive letter-spacing reset for embed view */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              #embed-animation-container,
              #embed-animation-container *,
              #embed-animation-container span,
              #embed-animation-container div {
                letter-spacing: 0 !important;
                font-feature-settings: "liga" 0, "calt" 0, "dlig" 0 !important;
                font-variant-ligatures: none !important;
                -webkit-font-feature-settings: "liga" 0, "calt" 0 !important;
                -moz-font-feature-settings: "liga" 0, "calt" 0 !important;
              }
            `,
          }}
        />
        <div id="embed-animation-container" className="w-full h-full max-w-[100vw] max-h-[100vh] flex items-center justify-center p-4">
          <UnifiedAnimationCanvas
            ref={previewRef}
            mode="preview"
            currentFrame={currentFrame}
          />
        </div>

        {/* Overlay controls for replay/open */}
        <div className="absolute top-4 right-4 flex gap-2 opacity-0 hover:opacity-100 transition-opacity duration-200">
          <Button size="sm" variant="secondary" onClick={handleReplay}>
            <i className="ri-replay-line mr-1"></i> Replay
          </Button>
          <Button size="sm" onClick={handleOpenOriginal}>
            Open in Jolly Code <i className="ri-external-link-line ml-1"></i>
          </Button>
        </div>

        {/* Play/Pause overlay if user wants to stop */}
        <div className="absolute bottom-4 left-4 opacity-0 hover:opacity-100 transition-opacity duration-200">
          <Button
            size="icon"
            variant="ghost"
            className="bg-black/50 hover:bg-black/70 text-white rounded-full"
            onClick={() => handlePlayPause({ track: true })}
          >
            <i className={isPlaying ? "ri-pause-fill" : "ri-play-fill"}></i>
          </Button>
        </div>

        {/* Watermark */}
        {shouldShowWatermark && (
          <a
            href="https://jollycode.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-6 right-6 flex items-center gap-0 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <span
              className={cn(
                "text-xs font-medium tracking-wide",
                isDarkBackground ? "text-white/90" : "text-foreground/90"
              )}
            >
              jollycode.dev
            </span>
          </a>
        )}
      </div>
    </QueryClientProvider>
  );
};

export default AnimateEmbedClient;
