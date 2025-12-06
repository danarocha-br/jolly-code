"use client";

import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Room } from "../room";
import { Nav } from "@/components/ui/nav";
import { Sidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { UpgradeDialog } from "@/components/ui/upgrade-dialog";
import {
  UnifiedAnimationCanvas,
  useAnimationController,
  calculateTotalDuration,
} from "@/features/animation";
import { useAnimationStore, useUserStore } from "@/app/store";
import { AnimationBookmarkButton } from "@/features/animations/ui/animation-bookmark-button";
import { LoginDialog } from "@/features/login";
import { UserTools } from "@/features/user-tools";
import { createClient } from "@/utils/supabase/client";
import { trackAnimationEvent } from "@/features/animation/analytics";
import { useAnimationPersistence } from "@/features/animations/hooks/use-animation-persistence";
import { useAnimationSharing } from "@/features/animation/hooks/use-animation-sharing";
import { useAnimationLimits } from "@/features/animations/hooks/use-animation-limits";
import { AnimationTabs } from "@/features/animation/components/animation-tabs";
import { AnimationBottomBar } from "@/features/animation/components/animation-bottom-bar";
import { ThemeInjector } from "@/features/animation/components/theme-injector";

export default function AnimationClientPage() {
  const router = useRouter();
  const [isSaveLoginOpen, setIsSaveLoginOpen] = useState(false);

  // --- Global Persistence Stores ---
  const user = useUserStore((state) => state.user);
  const activeTabId = useAnimationStore((state) => state.activeAnimationTabId);
  const setActiveTabId = useAnimationStore((state) => state.setActiveAnimationTabId);
  const animationSettings = useAnimationStore((state) => state.animationSettings);
  const isAnimationSaved = useAnimationStore((state) => state.isAnimationSaved);

  // --- External Logic Hooks ---
  const {
    currentFrame,
    progress,
    isPlaying,
    handlePlayPause,
    handleReset,
    slides,
  } = useAnimationController();

  const totalDuration = calculateTotalDuration(slides);

  // --- Supabase User Auth ---
  const supabase = createClient();
  useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        useUserStore.setState({ user: data.user });
      } else {
        useUserStore.setState({ user: null });
      }
      return data.user;
    },
  });

  // --- Logic Hooks ---

  const {
    saveAnimation,
    removeCurrentAnimation
  } = useAnimationPersistence({
    user,
    slides,
    animationSettings,
  });

  const {
    mode,
    isSharedView,
    toggleMode
  } = useAnimationSharing({
    user,
    slides,
    isPlaying,
    handlePlayPause,
    handleReset,
    progress,
  });

  const {
    isUpgradeOpen,
    setIsUpgradeOpen,
    upgradeContext,
    checkSaveLimits,
    handleSlideLimitReached,
    slideLimitMax,
  } = useAnimationLimits({
    user,
    slidesCount: slides.length,
  });


  // --- Event Handlers ---

  const handleSaveAnimationClick = () => {
    if (!user) {
      toast.error("You must be logged in to save animations.");
      trackAnimationEvent("guest_upgrade_prompted", user, { trigger: "save_animation" });
      trackAnimationEvent("guest_limit_reached", user, { limit_type: "animations", action_attempted: "save_animation" });
      setIsSaveLoginOpen(true);
      return;
    }

    if (slides.length < 2) {
      toast.error("Add at least two slides to save an animation.");
      return;
    }

    if (!checkSaveLimits()) {
      return;
    }

    saveAnimation();
  };


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
      onRemove={removeCurrentAnimation}
      disabled={slides.length < 2 && !isAnimationSaved}
    />
  );

  return (
    <>
      <ThemeInjector />

      <LoginDialog
        open={isSaveLoginOpen}
        onOpenChange={setIsSaveLoginOpen}
        hideTrigger
      />

      <UpgradeDialog
        open={isUpgradeOpen}
        onOpenChange={setIsUpgradeOpen}
        limitType={upgradeContext.type}
        currentCount={upgradeContext.current ?? 0}
        maxCount={upgradeContext.max ?? null}
      />

      <Room user={user ?? null}>
        <div className="relative min-h-screen !bg-background flex flex-col lg:flex-row">
          <Sidebar />
          <div className="absolute top-1/3 z-50"><UserTools /></div>

          <div className="flex-1 min-h-screen flex flex-col">
            <Nav />

            <main className="flex-1 pt-16 flex flex-col justify-center pb-64">
              <div className="flex-1 flex items-center justify-center overflow-auto py-6 relative">
                <div className="w-full max-w-3xl px-0 relative group/editor space-y-4">

                  {/* Top Tabs */}
                  <AnimationTabs
                    user={user}
                    activeTabId={activeTabId}
                    setActiveTabId={setActiveTabId}
                  />

                  {/* Main Canvas */}
                  <div className="w-full max-w-6xl mx-auto px-0">
                    <UnifiedAnimationCanvas
                      mode={mode}
                      currentFrame={currentFrame}
                      actionSlot={bookmarkActionSlot}
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Controls */}
              <AnimationBottomBar
                mode={mode}
                isPlaying={isPlaying}
                progress={progress}
                totalDuration={totalDuration}
                slidesCount={slides.length}
                isSharedView={isSharedView}
                slideLimitMax={slideLimitMax}
                onToggleMode={toggleMode}
                onPlayPause={handlePlayPause}
                onReset={handleReset}
                onSlideLimitReached={handleSlideLimitReached}
              />
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
