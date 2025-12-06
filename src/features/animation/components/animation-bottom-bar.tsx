"use client";

import { AnimationControls, Timeline } from "@/features/animation";

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

  const handleResetSlides = () => {
    if (confirm("Reset all slides to default? This will clear your current work.")) {
      localStorage.removeItem("animation-store");
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 bg-background/95 backdrop-blur border-t border-border/60 transition-[padding] duration-300 ease-out lg:pl-[var(--sidebar-width,_50px)]">
      <div className="w-full px-0 py-3">
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
    </div>
  );
}
