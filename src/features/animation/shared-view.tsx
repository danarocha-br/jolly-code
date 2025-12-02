"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Room } from "@/app/room";
import { Nav } from "@/components/ui/nav";
import { Sidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/react-query/query-client";
import {
  AnimationControls,
  UnifiedAnimationCanvas,
  useAnimationController,
  calculateTotalDuration,
  Timeline,
} from "@/features/animation";
import { useAnimationStore, useEditorStore } from "@/app/store";
import { themes } from "@/lib/themes-options";
import { fonts } from "@/lib/fonts-options";
import { AnimationSharePayload } from "./share-utils";

type AnimateSharedClientProps = {
  payload: AnimationSharePayload;
};

export const AnimateSharedClient = ({ payload }: AnimateSharedClientProps) => {
  const router = useRouter();
  const [mode, setMode] = useState<"edit" | "preview">("preview");
  const [isReady, setIsReady] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const hasStartedSharedPlayback = useRef(false);
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

  const totalDuration = useMemo(() => calculateTotalDuration(slides), [slides]);

  const toggleMode = useCallback(() => {
    // Locked to preview for shared view
    return;
  }, []);

  const sanitizedSlides = useMemo(
    () =>
      (payload.slides || []).map((slide, index) => ({
        id: slide.id || `shared-slide-${index + 1}`,
        code: slide.code || "",
        title: slide.title || `Slide ${index + 1}`,
        language: slide.language || "plaintext",
        autoDetectLanguage: slide.autoDetectLanguage ?? true,
        duration: typeof slide.duration === "number" ? slide.duration : 2,
      })),
    [payload.slides]
  );

  useEffect(() => {
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
      presentational: true,
    }));

    setIsReady(true);
    return () => {
      useEditorStore.setState((state) => ({
        ...state,
        presentational: false,
      }));
    };
  }, [payload.editor, payload.settings, sanitizedSlides]);

  useEffect(() => {
    if (!isReady) return;
    if (slides.length < 2) return;
    if (hasStartedSharedPlayback.current) return;

    hasStartedSharedPlayback.current = true;
    handleReset();
    if (!isPlaying) {
      handlePlayPause();
    }
  }, [handlePlayPause, handleReset, isPlaying, isReady, slides.length]);

  useEffect(() => {
    if (!isReady) return;
    if (slides.length < 2) return;
    if (isPlaying) return;
    if (progress < 100) return;

    handleReset();
    handlePlayPause();
  }, [handlePlayPause, handleReset, isPlaying, isReady, progress, slides.length]);

  if (!isReady) {
    return null;
  }

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
      <Room user={null}>
        <div className="min-h-screen !bg-background flex flex-col lg:flex-row">
          <Sidebar />

          <div className="flex-1 min-h-screen flex flex-col">
            <Nav />

            <main className="flex-1 pt-16 flex flex-col pb-64">
              <div className="flex-1 flex items-center justify-center overflow-auto py-6 relative">
                <div className="w-full max-w-6xl px-6">
                  <UnifiedAnimationCanvas
                    ref={previewRef}
                    mode={mode}
                    currentFrame={currentFrame}
                  />
                </div>
              </div>

              <div
                className="fixed inset-x-0 bottom-0 z-40 bg-background/95 backdrop-blur border-t border-border/60 transition-[padding] duration-300 ease-out"
                style={{
                  paddingLeft: "var(--sidebar-width, 50px)",
                  paddingRight: "12px",
                }}
              >
                <div className="w-full px-0 py-3">
                  <AnimationControls
                    mode={mode}
                    isPlaying={isPlaying}
                    progress={progress}
                    totalDuration={totalDuration}
                    onToggleMode={toggleMode}
                    onPlayPause={handlePlayPause}
                    onReset={handleReset}
                    onResetSlides={() => undefined}
                    canPlay={slides.length >= 2}
                    modeLocked
                    hideModeToggle
                    hideSlideControls
                  />
                  {/* No timeline in shared view */}
                </div>
              </div>
            </main>

            <footer className="bg-white/20 rounded-2xl backdrop-blur-3xl flex justify-center w-full lg:w-auto fixed bottom-20 p-3 left-1/2 -translate-x-1/2">
              <Button size="lg" variant="secondary" onClick={() => router.push("/")}>
                <i className="ri-magic-fill text-lg mr-3" />
                Create my Snippet
              </Button>
            </footer>
          </div>
        </div>
      </Room>
    </QueryClientProvider>
  );
};
