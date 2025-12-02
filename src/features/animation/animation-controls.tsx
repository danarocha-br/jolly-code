import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useAnimationStore } from "@/app/store";
import { cn } from "@/lib/utils";

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
  modeLocked?: boolean;
  hideModeToggle?: boolean;
  hideSlideControls?: boolean;
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
  modeLocked = false,
  hideModeToggle = false,
  hideSlideControls = false,
}: AnimationControlsProps) => {
  const activeSlideIndex = useAnimationStore((state) => state.activeSlideIndex);
  const slides = useAnimationStore((state) => state.slides);
  const updateSlide = useAnimationStore((state) => state.updateSlide);
  const activeSlide = slides[activeSlideIndex];

  const handleDurationChange = (value: string) => {
    if (!activeSlide) return;
    const parsed = parseFloat(value);
    if (!Number.isFinite(parsed)) return;
    const clamped = Math.max(0.1, Math.min(15, parsed));
    updateSlide(activeSlide.id, { duration: clamped });
  };

  return (
    <div className="relative px-6 pb-2">
      {/* Progress border effect */}
      <div
        className="absolute -top-3 left-0 h-[2px] bg-success dark:bg-primary transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />

      <div className={cn("flex items-center justify-between md:ml-18", mode === "preview" && "!ml-0")}>
        <div className="relative flex-1 flex items-center justify-center gap-4">

          {!hideModeToggle && (
            <>
              <div className="flex gap-1 items-center p-1 bg-card border dark:border-none rounded-full z-50">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onToggleMode}
                  disabled={modeLocked}
                  className={cn(
                    "h-6 text-xs rounded-full border",
                    mode === "edit" ? "bg-muted" : "border-transparent"
                  )}
                >
                  <>
                    <i className="ri-pencil-line mr-2" />
                    Edit
                  </>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn(
                    "h-6 text-xs rounded-full border",
                    mode === "preview" ? "bg-muted" : "border-transparent"
                  )}
                  onClick={onToggleMode}
                  disabled={modeLocked}
                >
                  <>
                    <i className="ri-eye-line mr-2" />
                    Preview
                  </>
                </Button>
              </div>

              <Separator orientation="vertical" className="h-8 bg-border dark:bg-border/40" />
            </>
          )}

          <Button
            size="icon"
            variant="secondary"
            className={"rounded-full size-10"}
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
            className="rounded-full size-10"
            onClick={onReset}
            disabled={mode === "edit" || progress === 0}
          >
            <i className="ri-restart-line text-lg" />
          </Button>

          {!hideSlideControls && <Separator orientation="vertical" className="h-8 bg-border dark:bg-border/40" />}

          {!hideSlideControls && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground hidden md:block">
                {totalDuration.toFixed(1)}s / 15s max
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Frame duration (s)</span>
                <Input
                  type="number"
                  min={0.1}
                  max={15}
                  step={0.1}
                  value={activeSlide?.duration ?? ""}
                  onChange={(e) => handleDurationChange(e.target.value)}
                  className="h-8 w-20 text-xs"
                  disabled={modeLocked}
                />
              </div>
            </div>
          )}
        </div>

        {!hideSlideControls && (
          <Button
            variant="ghost"
            onClick={onResetSlides}
            title="Reset all slides"
            disabled={modeLocked}
          >
            <i className="ri-close-circle-line text-lg mr-2" />
            Reset slides
          </Button>
        )}
      </div>
    </div>
  );
};
