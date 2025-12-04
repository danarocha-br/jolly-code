"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { Room } from "../room";
import { Nav } from "@/components/ui/nav";
import { Sidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Timeline,
  UnifiedAnimationCanvas,
  AnimationControls,
  useAnimationController,
  calculateTotalDuration,
} from "@/features/animation";
import { useAnimationStore, useEditorStore, useUserStore } from "@/app/store";
import { themes } from "@/lib/themes-options";
import { fonts } from "@/lib/fonts-options";
import { decodeAnimationSharePayload } from "@/features/animation/share-utils";
import { AnimationBookmarkButton } from "@/features/animations/ui/animation-bookmark-button";
import { createAnimation, removeAnimation, updateAnimation } from "@/features/animations/queries";
import { debounce } from "@/lib/utils/debounce";
import { LoginDialog } from "@/features/login";
import { trackAnimationEvent } from "@/features/animation/analytics";
import { UserTools } from "@/features/user-tools";
import type { AnimationSlide, AnimationSettings } from "@/types/animation";

type AnimationTab = {
  id: string;
  animationId?: string;
  title: string;
  saved: boolean;
  slides: AnimationSlide[];
  settings: AnimationSettings;
};

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
  const animationSettings = useAnimationStore((state) => state.animationSettings);
  const animationId = useAnimationStore((state) => state.animationId);
  const isAnimationSaved = useAnimationStore((state) => state.isAnimationSaved);
  const createNewAnimation = useAnimationStore((state) => state.createNewAnimation);
  const setAnimationId = useAnimationStore((state) => state.setAnimationId);
  const setIsAnimationSaved = useAnimationStore((state) => state.setIsAnimationSaved);
  const tabs = useAnimationStore((state) => state.tabs);
  const activeTabId = useAnimationStore((state) => state.activeAnimationTabId);
  const setActiveTabId = useAnimationStore((state) => state.setActiveAnimationTabId);
  const updateActiveAnimation = useAnimationStore((state) => state.updateActiveAnimation);
  const closeTab = useAnimationStore((state) => state.closeTab);
  const presentational = useEditorStore((state) => state.presentational);
  const user = useUserStore((state) => state.user);
  const user_id = user?.id;
  const queryClient = useQueryClient();

const sharedFlag = searchParams.get("animation_shared");
const sharedData = searchParams.get("animation");
const getTimestamp = () => new Date().getTime();

  const [mode, setMode] = useState<"edit" | "preview">(
    () => (sharedFlag === "true" ? "preview" : "edit")
  );
  const [isSharedView, setIsSharedView] = useState(sharedFlag === "true");
  const previewRef = useRef<HTMLDivElement>(null);
  const hasRestoredSharedState = useRef(false);
  const hasStartedSharedPlayback = useRef(false);
  const lastAutoSaveRef = useRef<number | null>(null);
  const [isSaveLoginOpen, setIsSaveLoginOpen] = useState(false);
  const modeStartRef = useRef<number>(0);
  const lastModeRef = useRef<"edit" | "preview">(sharedFlag === "true" ? "preview" : "edit");

  // Get editor theme and font settings
  const backgroundTheme = useEditorStore((state) => state.backgroundTheme);
  const fontFamily = useEditorStore((state) => state.fontFamily);

  const animationTitle = slides?.[0]?.title || "Untitled animation";
  const currentUrlOrigin =
    typeof window !== "undefined" ? window.location.href : "";
  const totalDuration = calculateTotalDuration(slides);

  useEffect(() => {
    if (modeStartRef.current === 0) {
      modeStartRef.current = getTimestamp();
    }
  }, []);

  // Use tabs from store directly
  const renderTabs = tabs;
  const tabsValue = activeTabId ?? tabs[0]?.id ?? "";

  const toggleMode = useCallback(() => {
    if (isSharedView) return;
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

  const { mutate: handleCreateAnimation } = useMutation({
    mutationFn: createAnimation,
    onSuccess: (result) => {
      if (result?.data) {
        updateActiveAnimation(result.data);
        trackAnimationEvent("create_animation", user, {
          animation_id: result.data.id,
          slide_count: slides.length,
          duration: totalDuration,
          has_custom_title: animationTitle !== "Untitled animation",
          transition_type: animationSettings.transitionType,
          export_format: animationSettings.exportFormat,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["animation-collections"] });
    },
  });

  const { mutate: handleUpdateAnimation } = useMutation({
    mutationFn: updateAnimation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["animation-collections"] });
    },
  });

  const { mutate: handleRemoveAnimation } = useMutation({
    mutationFn: removeAnimation,
    onSuccess: () => {
      if (animationId) {
        trackAnimationEvent("delete_animation", user, {
          animation_id: animationId,
        });
      }
      setIsAnimationSaved(false);
      setAnimationId(undefined);
      queryClient.invalidateQueries({ queryKey: ["animation-collections"] });
    },
  });

  const debouncedUpdateAnimation = useRef<
    ((id: string, slidesPayload: typeof slides, settingsPayload: typeof animationSettings) => void) | null
  >(null);

  useEffect(() => {
    debouncedUpdateAnimation.current = debounce(
      (id: string, slidesPayload: typeof slides, settingsPayload: typeof animationSettings) => {
        if (id && isAnimationSaved) {
          const now = getTimestamp();
          const timeSinceLastSave = lastAutoSaveRef.current
            ? (now - lastAutoSaveRef.current) / 1000
            : null;
          lastAutoSaveRef.current = now;
          trackAnimationEvent("animation_auto_saved", user, {
            animation_id: id,
            slide_count: slidesPayload.length,
            time_since_last_save: timeSinceLastSave,
          });
          handleUpdateAnimation({
            id,
            user_id,
            title: animationTitle,
            slides: slidesPayload,
            settings: settingsPayload,
          });
        }
      },
      1000
    );
  }, [animationTitle, handleUpdateAnimation, isAnimationSaved, user, user_id]);

  useEffect(() => {
    if (isAnimationSaved && animationId && user_id) {
      debouncedUpdateAnimation.current?.(animationId, slides, animationSettings);
    }
  }, [animationId, animationSettings, isAnimationSaved, slides, user_id]);

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

    hasRestoredSharedState.current = true;
  }, [sharedData, sharedFlag]);

  useEffect(() => {
    if (!isSharedView) return;
    if (slides.length < 2) return;
    if (hasStartedSharedPlayback.current) return;

    hasStartedSharedPlayback.current = true;
    handleReset({ track: false });
    if (!isPlaying) {
      handlePlayPause({ track: false });
    }
  }, [handlePlayPause, handleReset, isPlaying, isSharedView, slides.length]);

  useEffect(() => {
    if (!isSharedView) return;
    if (slides.length < 2) return;
    if (isPlaying) return;
    if (progress < 100) return;

    handleReset({ track: false });
    handlePlayPause({ track: false });
  }, [handlePlayPause, handleReset, isPlaying, isSharedView, progress, slides.length]);

  const canSaveAnimation = slides.length >= 2;
  const bookmarkDisabled = !canSaveAnimation && !isAnimationSaved;

  const handleSaveAnimationClick = useCallback(() => {
    if (!user_id) {
      toast.error("You must be logged in to save animations.");
      trackAnimationEvent("guest_upgrade_prompted", user, {
        trigger: "save_animation",
      });
      trackAnimationEvent("guest_limit_reached", user, {
        limit_type: "animations",
        action_attempted: "save_animation",
      });
      setIsSaveLoginOpen(true);
      return;
    }

    if (!canSaveAnimation) {
      toast.error("Add at least two slides to save an animation.");
      return;
    }

    const newId = animationId || uuidv4();

    handleCreateAnimation({
      id: newId,
      user_id,
      currentUrl: currentUrlOrigin,
      title: animationTitle,
      slides,
      settings: animationSettings,
    });
  }, [
    animationId,
    animationSettings,
    animationTitle,
    canSaveAnimation,
    currentUrlOrigin,
    handleCreateAnimation,
    slides,
    user,
    user_id,
  ]);

  const handleRemoveAnimationClick = useCallback(() => {
    if (!animationId) {
      return;
    }

    handleRemoveAnimation({
      animation_id: animationId,
      user_id,
    });
  }, [animationId, handleRemoveAnimation, user_id]);

  const handleTabChange = useCallback(
    (nextTabId: string) => {
      if (nextTabId === activeTabId) return;
      trackAnimationEvent("animation_tab_switched", user, {
        from_tab_id: activeTabId,
        to_tab_id: nextTabId,
        tab_count: tabs.length,
      });
      setActiveTabId(nextTabId);
    },
    [activeTabId, setActiveTabId, tabs.length, user]
  );

  const handleCreateNewAnimationTab = useCallback(() => {
    createNewAnimation();
    trackAnimationEvent("animation_tab_created", user, {
      tab_count: tabs.length + 1,
    });
  }, [createNewAnimation, tabs.length, user]);

  const handleRemoveTab = useCallback(
    (tabId: string) => {
      if (tabs.length <= 1) return;
      const targetTab = tabs.find((tab) => tab.id === tabId);
      trackAnimationEvent("animation_tab_closed", user, {
        tab_count_after: tabs.length - 1,
        was_saved: targetTab?.saved ?? false,
      });
      closeTab(tabId);
    },
    [closeTab, tabs, user]
  );

  const bookmarkActionSlot = !user ? (
    <LoginDialog>
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-2 right-2 rounded-full bg-white/70 text-black dark:bg-black/50 dark:text-white"
      >
        <i className="ri-bookmark-line" />
      </Button>
    </LoginDialog>
  ) : (
    <AnimationBookmarkButton
      isAnimationSaved={!!isAnimationSaved}
      onSave={handleSaveAnimationClick}
      onRemove={handleRemoveAnimationClick}
      disabled={bookmarkDisabled}
    />
  );

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
      <LoginDialog
        open={isSaveLoginOpen}
        onOpenChange={setIsSaveLoginOpen}
        hideTrigger
      />
      <Room user={null}>
        <div className="min-h-screen !bg-background flex flex-col lg:flex-row">
          <Sidebar />

          <div className="flex-1 min-h-screen flex flex-col">
            <Nav />

            <main className="flex-1 pt-16 flex flex-col justify-center pb-64">
              {/* Main Content - Centered like code editor */}
              <div className="flex-1 flex items-center justify-center overflow-auto py-6 relative">
                <div className="w-full max-w-6xl px-6 relative group/editor">
                  <div className="w-full max-w-3xl mx-auto mb-4 flex items-center gap-2">
                    <Tabs value={tabsValue} onValueChange={handleTabChange}>
                      <TabsList className="bg-transparent px-0 py-0 text-foreground">
                        {renderTabs.map((tab) => (
                          <TabsTrigger
                            key={tab.id}
                            value={tab.id}
                            className="relative group/tab max-w-[220px] capitalize data-[state=active]:bg-foreground/[0.08] data-[state=active]:text-foreground text-foreground/70 hover:text-foreground"
                          >
                            <span className="truncate flex items-center gap-2">
                              {tab.saved ? <i className="ri-bookmark-fill" /> : null}
                              {tab.title}
                            </span>
                            {tabs.length > 1 && !presentational ? (
                              <span
                                role="button"
                                className="-mr-2.5 ml-1 transition-opacity opacity-0 group-hover/tab:opacity-100 inline-flex items-center justify-center w-4 h-4 rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveTab(tab.id);
                                }}
                              >
                                <i className="ri-close-line" />
                              </span>
                            ) : null}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>

                    <Button
                      variant="secondary"
                      size="icon"
                      className="bg-foreground/[0.02]"
                      onClick={handleCreateNewAnimationTab}
                    >
                      <i className="ri-add-line text-lg" />
                    </Button>
                  </div>
                  <UnifiedAnimationCanvas
                    ref={previewRef}
                    mode={mode}
                    currentFrame={currentFrame}
                    actionSlot={bookmarkActionSlot}
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
              <UserTools />
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
