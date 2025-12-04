import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useAnimationStore, useUserStore } from "@/app/store";
import { playAnimation, AnimationFrame, calculateTotalDuration } from "./animator";
import { trackAnimationEvent } from "@/features/animation/analytics";

export const useAnimationController = () => {
  const slides = useAnimationStore((state) => state.slides);
  const animationSettings = useAnimationStore((state) => state.animationSettings);
  const isPlaying = useAnimationStore((state) => state.isPlaying);
  const play = useAnimationStore((state) => state.play);
  const pause = useAnimationStore((state) => state.pause);
  const reset = useAnimationStore((state) => state.reset);

  const [currentFrame, setCurrentFrame] = useState<AnimationFrame | null>(null);
  const [progress, setProgress] = useState(0);
  const animationRef = useRef<AsyncGenerator<AnimationFrame> | null>(null);
  const completionTrackedRef = useRef(false);
  const user = useUserStore((state) => state.user);

  const totalDuration = useMemo(
    () => calculateTotalDuration(slides),
    [slides]
  );

  // Animation Loop
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
  }, [isPlaying, slides, animationSettings, pause]);

  const handlePlayPause = useCallback((options?: { track?: boolean }) => {
    const shouldTrack = options?.track ?? true;
    if (isPlaying) {
      pause();
      if (shouldTrack) {
        const currentTime = (progress / 100) * totalDuration;
        trackAnimationEvent("animation_paused", user, {
          progress_percent: progress,
          current_time: Number.isFinite(currentTime) ? currentTime : 0,
        });
      }
    } else {
      play();
      if (shouldTrack) {
        trackAnimationEvent("animation_played", user, {
          slide_count: slides.length,
          total_duration: totalDuration,
          from_start: progress === 0,
        });
      }
    }
  }, [isPlaying, pause, play, progress, slides.length, totalDuration, user]);

  const handleReset = useCallback((options?: { track?: boolean }) => {
    const shouldTrack = options?.track ?? true;
    reset();
    setCurrentFrame(null);
    setProgress(0);
    completionTrackedRef.current = false;
    if (shouldTrack) {
      trackAnimationEvent("animation_reset", user, {
        progress_when_reset: progress,
      });
    }
  }, [progress, reset, user]);

  useEffect(() => {
    if (progress >= 100 && !completionTrackedRef.current) {
      trackAnimationEvent("animation_completed", user, {
        slide_count: slides.length,
        total_duration: totalDuration,
      });
      completionTrackedRef.current = true;
    }
  }, [progress, slides.length, totalDuration, user]);

  return {
    currentFrame,
    progress,
    isPlaying,
    handlePlayPause,
    handleReset,
    slides,
  };
};
