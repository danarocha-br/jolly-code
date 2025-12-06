"use client";
import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useAnimationStore } from "@/app/store";
import { playAnimation, calculateTotalDuration, AnimationFrame } from "./animator";
import { FadeTransitionFrame } from "./transitions/fade-transition";
import { DiffTransitionFrame } from "./transitions/diff-transition";
import { MorphingCodeRenderer } from "./morphing-code-renderer";

export const AnimationPreview = () => {
  const slides = useAnimationStore((state) => state.slides);
  const animationSettings = useAnimationStore((state) => state.animationSettings);
  const isPlaying = useAnimationStore((state) => state.isPlaying);
  const play = useAnimationStore((state) => state.play);
  const pause = useAnimationStore((state) => state.pause);
  const reset = useAnimationStore((state) => state.reset);

  const [currentFrame, setCurrentFrame] = useState<AnimationFrame | null>(null);
  const [progress, setProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<AsyncGenerator<AnimationFrame> | null>(null);

  const totalDuration = calculateTotalDuration(slides);

  useEffect(() => {
    let cancelled = false;

    const runAnimation = async () => {
      if (!isPlaying) return;

      try {
        animationRef.current = playAnimation(
          slides,
          animationSettings,
          (current, total) => {
            if (!cancelled) {
              setProgress((current / total) * 100);
            }
          }
        );

        for await (const frame of animationRef.current) {
          if (cancelled || !isPlaying) break;
          setCurrentFrame(frame);
        }

        // Animation completed
        if (!cancelled) {
          pause();
          setProgress(100);
        }
      } catch (error) {
        console.error("Animation error:", error);
        pause();
      }
    };

    if (isPlaying) {
      runAnimation();
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, slides, animationSettings]);

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  const handleReset = () => {
    reset();
    setCurrentFrame(null);
    setProgress(0);
  };

  const handleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const renderCurrentFrame = () => {
    // Normalized render path so React keeps the same tree between frames
    const baseMorphProps = {
      fromCode: slides[0]?.code || "",
      toCode: slides[0]?.code || "",
      fromTitle: slides[0]?.title,
      toTitle: slides[0]?.title,
      language: slides[0]?.language || "plaintext",
      progress: 1,
    };

    let morphProps = baseMorphProps;
    let motionStyle: Record<string, number> = { x: 0, scale: 1, opacity: 1 };

    if (currentFrame) {
      if (currentFrame.type === "slide") {
        morphProps = {
          fromCode: currentFrame.currentSlide.code,
          toCode: currentFrame.currentSlide.code,
          fromTitle: currentFrame.currentSlide.title,
          toTitle: currentFrame.currentSlide.title,
          language: currentFrame.currentSlide.language,
          progress: 1,
        };
      } else {
        const frame = currentFrame.frame;
        if (!frame) return null;

        if ("fromOpacity" in frame && "toOpacity" in frame) {
          const fadeFrame = frame as FadeTransitionFrame;
          morphProps = {
            fromCode: fadeFrame.fromSlide.code,
            toCode: fadeFrame.toSlide.code,
            fromTitle: fadeFrame.fromSlide.title,
            toTitle: fadeFrame.toSlide.title,
            language: fadeFrame.toSlide.language,
            progress: fadeFrame.progress,
          };

          const slideX = (1 - fadeFrame.progress) * -50;
          const scale = 0.95 + fadeFrame.progress * 0.05;
          const opacity =
            fadeFrame.progress < 0.1
              ? fadeFrame.progress * 10
              : fadeFrame.progress > 0.9
              ? (1 - fadeFrame.progress) * 10
              : 1;

          motionStyle = { x: slideX, scale, opacity };
        } else {
          const diffFrame = frame as DiffTransitionFrame;
          morphProps = {
            fromCode: diffFrame.fromSlide.code,
            toCode: diffFrame.toSlide.code,
            fromTitle: diffFrame.fromSlide.title,
            toTitle: diffFrame.toSlide.title,
            language: diffFrame.toSlide.language,
            progress: diffFrame.progress,
          };
        }
      }
    }

    return (
      <motion.div
        style={motionStyle}
        transition={{
          duration: 0,
          ease: "linear",
        }}
      >
        <MorphingCodeRenderer {...morphProps} />
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col h-full" ref={containerRef}>
      <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-muted/30">
        <div className="w-full max-w-4xl">{renderCurrentFrame()}</div>
      </div>

      <div className="border-t bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="secondary"
            onClick={handlePlayPause}
            disabled={slides.length < 2}
          >
            {isPlaying ? (
              <i className="ri-pause-fill" />
            ) : (
              <i className="ri-play-fill" />
            )}
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={handleReset}
            disabled={progress === 0}
          >
            <i className="ri-restart-line" />
          </Button>

          <div className="flex-1 px-2">
            <Slider
              label="Progress"
              value={[progress]}
              max={100}
              step={1}
              className="cursor-not-allowed"
              disabled
            />
          </div>

          <span className="text-sm text-muted-foreground min-w-[60px] text-right">
            {totalDuration.toFixed(1)}s
          </span>

          <Button
            size="icon"
            variant="ghost"
            onClick={handleFullscreen}
          >
            {isFullscreen ? (
              <i className="ri-fullscreen-exit-line" />
            ) : (
              <i className="ri-fullscreen-line" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
