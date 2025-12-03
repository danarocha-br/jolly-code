"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Room } from "../room";
import { Nav } from "@/components/ui/nav";
import { Sidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Timeline,
  UnifiedAnimationCanvas,
  AnimationControls,
  useAnimationController,
  calculateTotalDuration,
} from "@/features/animation";
import { useAnimationStore, useEditorStore } from "@/app/store";
import { themes } from "@/lib/themes-options";
import { fonts } from "@/lib/fonts-options";
import { decodeAnimationSharePayload } from "@/features/animation/share-utils";

export default function AnimatePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const {
    currentFrame,
    progress,
    isPlaying,
    handlePlayPause,
    handleReset,
    slides,
  } = useAnimationController();

  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [isSharedView, setIsSharedView] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const hasRestoredSharedState = useRef(false);
  const hasStartedSharedPlayback = useRef(false);

  // Get editor theme and font settings
  const backgroundTheme = useEditorStore((state) => state.backgroundTheme);
  const fontFamily = useEditorStore((state) => state.fontFamily);

  const totalDuration = calculateTotalDuration(slides);

  const toggleMode = useCallback(() => {
    if (isSharedView) return;
    const newMode = mode === "edit" ? "preview" : "edit";
    setMode(newMode);
    if (newMode === "edit") {
      if (isPlaying) handlePlayPause();
      handleReset();
    }
  }, [handlePlayPause, handleReset, isPlaying, isSharedView, mode]);

  const sharedFlag = searchParams.get("animation_shared");
  const sharedData = searchParams.get("animation");

  useEffect(() => {
    // Ensure edit/preview mode is treated as non-presentational unless explicitly shared
    if (sharedFlag !== "true") {
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
  }, [sharedFlag]);

  useEffect(() => {
    if (hasRestoredSharedState.current) return;
    if (sharedFlag !== "true" || !sharedData) return;

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
      presentational: true,
    }));

    setMode("preview");
    setIsSharedView(true);
    hasRestoredSharedState.current = true;
  }, [sharedData, sharedFlag]);

  useEffect(() => {
    if (!isSharedView) return;
    if (slides.length < 2) return;
    if (hasStartedSharedPlayback.current) return;

    hasStartedSharedPlayback.current = true;
    handleReset();
    if (!isPlaying) {
      handlePlayPause();
    }
  }, [handlePlayPause, handleReset, isPlaying, isSharedView, slides.length]);

  useEffect(() => {
    if (!isSharedView) return;
    if (slides.length < 2) return;
    if (isPlaying) return;
    if (progress < 100) return;

    handleReset();
    handlePlayPause();
  }, [handlePlayPause, handleReset, isPlaying, isSharedView, progress, slides.length]);

  return (
    <>
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
              {/* Main Content - Centered like code editor */}
              <div className="flex-1 flex items-center justify-center overflow-auto py-6 relative">
                <div className="w-full max-w-6xl px-6">
                  <UnifiedAnimationCanvas
                    ref={previewRef}
                    mode={mode}
                    currentFrame={currentFrame}
                  />
                </div>
              </div>

              {/* Bottom Controls */}
              <div
                className="fixed inset-x-0 bottom-0 z-40 bg-background/95 backdrop-blur border-t border-border/60 transition-[padding] duration-300 ease-out lg:pl-[var(--sidebar-width,_50px)]"
              >
                <div className="w-full px-0 py-3">
                  {/* Controls */}
                  <AnimationControls
                    mode={mode}
                    isPlaying={isPlaying}
                    progress={progress}
                    totalDuration={totalDuration}
                    onToggleMode={toggleMode}
                    onPlayPause={handlePlayPause}
                    onReset={handleReset}
                    onResetSlides={() => {
                      if (confirm("Reset all slides to default? This will clear your current work.")) {
                        localStorage.removeItem("animation-store");
                        window.location.reload();
                      }
                    }}
                    canPlay={slides.length >= 2}
                    modeLocked={isSharedView}
                  />
                  {/* Timeline */}
                  {!isSharedView && <Timeline />}
                </div>
              </div>

              {/* <UserTools /> */}
            </main>

            {/* Shared CTA */}
            {isSharedView && (
              <footer className="bg-white/20 rounded-2xl backdrop-blur-3xl flex justify-center w-full lg:w-auto fixed bottom-20 p-3 left-1/2 -translate-x-1/2">
                <Button size="lg" variant="secondary" onClick={() => router.push("/")}>
                  <i className="ri-magic-fill text-lg mr-3" />
                  Create my Snippet
                </Button>
              </footer>
            )}
          </div>
        </div>
      </Room>
    </>
  );
}
