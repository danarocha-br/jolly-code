import { useState, useEffect, useRef, useCallback } from "react";
import { useAnimationStore } from "@/app/store";
import { playAnimation, AnimationFrame } from "./animator";

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

    const handlePlayPause = useCallback(() => {
        if (isPlaying) {
            pause();
        } else {
            play();
        }
    }, [isPlaying, pause, play]);

    const handleReset = useCallback(() => {
        reset();
        setCurrentFrame(null);
        setProgress(0);
    }, [reset]);

    return {
        currentFrame,
        progress,
        isPlaying,
        handlePlayPause,
        handleReset,
        slides,
    };
};
