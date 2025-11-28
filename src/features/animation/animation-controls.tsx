import React from "react";
import { Button } from "@/components/ui/button";

interface AnimationControlsProps {
  mode: "edit" | "preview";
  isPlaying: boolean;
  progress: number;
  totalDuration: number;
  onToggleMode: () => void;
  onPlayPause: () => void;
  onReset: () => void;
  onResetSlides: () => void;
  canPlay: boolean;
}

export const AnimationControls = ({
  mode,
  isPlaying,
  progress,
  totalDuration,
  onToggleMode,
  onPlayPause,
  onReset,
  onResetSlides,
  canPlay,
}: AnimationControlsProps) => {
  return (
    <div className="relative px-6 py-4 border-t overflow-hidden">
      {/* Progress border effect */}
      <div
        className="absolute top-0 left-0 h-[2px] bg-primary transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />

      <div className="flex items-center justify-between">
        <div className="flex-1 flex items-center justify-center gap-4">
          <Button
            size="sm"
            variant={mode === "edit" ? "secondary" : "ghost"}
            onClick={onToggleMode}
            className="h-8"
          >
            {mode === "edit" ? (
              <>
                <i className="ri-eye-line mr-2" />
                Preview
              </>
            ) : (
              <>
                <i className="ri-edit-line mr-2" />
                Edit
              </>
            )}
          </Button>

          <div className="w-px h-6 bg-border" />

          <Button
            size="icon"
            variant="ghost"
            className="rounded-full h-8 w-8"
            onClick={onPlayPause}
            disabled={mode === "edit" || !canPlay}
          >
            {isPlaying ? (
              <i className="ri-pause-fill text-lg" />
            ) : (
              <i className="ri-play-fill text-lg" />
            )}
          </Button>

          <Button
            size="icon"
            variant="ghost"
            className="rounded-full h-8 w-8"
            onClick={onReset}
            disabled={mode === "edit" || progress === 0}
          >
            <i className="ri-restart-line text-lg" />
          </Button>

          <div className="w-px h-6 bg-border" />

          <span className="text-xs text-muted-foreground">
            {totalDuration.toFixed(1)}s / 15s max
          </span>
        </div>

        <Button
          size="icon"
          variant="ghost"
          className="rounded-full h-8 w-8"
          onClick={onResetSlides}
          title="Reset all slides"
        >
          <i className="ri-restart-line text-lg" />
        </Button>
      </div>
    </div>
  );
};
