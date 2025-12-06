"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useAnimationStore } from "@/app/store";
import { AnimationControls, Timeline } from "@/features/animation";
import { ResetAnimationDialog } from "./reset-animation-dialog";

type AnimationBottomBarProps = {
  mode: "edit" | "preview";
  isPlaying: boolean;
  progress: number;
  totalDuration: number;
  slidesCount: number;
  isSharedView: boolean;
  slideLimitMax: number | null;
  onToggleMode: () => void;
  onPlayPause: () => void;
  onReset: () => void;
  onSlideLimitReached: (payload: { current: number; max?: number | null }) => void;
};

export function AnimationBottomBar({
  mode,
  isPlaying,
  progress,
  totalDuration,
  slidesCount,
  isSharedView,
  slideLimitMax,
  onToggleMode,
  onPlayPause,
  onReset,
  onSlideLimitReached,
}: AnimationBottomBarProps) {

  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const resetActiveAnimation = useAnimationStore((state) => state.resetActiveAnimation);

  const handleResetSlides = () => {
    setIsResetDialogOpen(true);
  };

  const handleConfirmReset = () => {
    resetActiveAnimation();
    toast.success("Animation reset to default");
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 bg-background/95 backdrop-blur border-t border-border/60 transition-[padding] duration-300 ease-out lg:pl-[var(--sidebar-width,_50px)]">
      <div className="w-full px-0 pt-3">
        {/* Controls */}
        <AnimationControls
          mode={mode}
          isPlaying={isPlaying}
          progress={progress}
          totalDuration={totalDuration}
          onToggleMode={onToggleMode}
          onPlayPause={onPlayPause}
          onReset={onReset}
          onResetSlides={handleResetSlides}
          canPlay={slidesCount >= 2}
          modeLocked={isSharedView}
        />
        {/* Timeline */}
        {!isSharedView && (
          <Timeline
            maxSlides={typeof slideLimitMax === "number" ? slideLimitMax : undefined}
            onSlideLimitReached={onSlideLimitReached}
          />
        )}
      </div>

      <ResetAnimationDialog
        open={isResetDialogOpen}
        onOpenChange={setIsResetDialogOpen}
        onConfirm={handleConfirmReset}
      />
    </div >
  );
}
