import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { toCanvas } from "html-to-image";
import GIF from "gif.js";

import { AnimationSlide, AnimationSettings } from "@/types/animation";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import { playAnimation, AnimationFrame } from "./animator";
import { MorphingCodeRenderer } from "./morphing-code-renderer";
import { WindowChrome, AnimationContainer } from "./layout-components";

interface GifExporterProps {
    slides: AnimationSlide[];
    settings: AnimationSettings;
    editorSettings: {
        backgroundTheme: string;
        fontFamily: string;
        fontSize: number;
        showBackground: boolean;
    };
    onProgress: (progress: number) => void;
    onComplete: (blob: Blob) => void;
    onError: (error: Error) => void;
    cancelled?: boolean;
    onCancelled?: () => void;
    hideWatermark?: boolean;
}

const getResolutionDimensions = (resolution: "720p" | "1080p") => {
    if (resolution === "1080p") return { width: 1920, height: 1080 };
    return { width: 1280, height: 720 };
};

export const GifExporter = ({
    slides,
    settings,
    editorSettings,
    onProgress,
    onComplete,
    onError,
    cancelled = false,
    onCancelled,
    hideWatermark = false,
}: GifExporterProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [currentFrame, setCurrentFrame] = useState<AnimationFrame | null>(null);
    const frameRenderedResolver = useRef<(() => void) | null>(null);
    const processingRef = useRef(false);
    const cancelRef = useRef(cancelled);

    useEffect(() => {
        cancelRef.current = cancelled;
    }, [cancelled]);

    // Notify when the frame has been rendered to the DOM
    useLayoutEffect(() => {
        if (frameRenderedResolver.current) {
            // Small timeout to ensure styles/fonts are settled
            const timer = setTimeout(() => {
                if (frameRenderedResolver.current) {
                    frameRenderedResolver.current();
                    frameRenderedResolver.current = null;
                }
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [currentFrame]);

    useEffect(() => {
        if (processingRef.current) return;
        processingRef.current = true;

        const processAnimation = async () => {
            try {
                const { width, height } = getResolutionDimensions(settings.resolution);
                const fps = settings.fps;

                // Initialize GIF encoder
                const gif = new GIF({
                    workers: 2,
                    quality: 10, // 1-20, lower is better quality
                    width,
                    height,
                    workerScript: "/gif.worker.js", // We'll need to copy this to public folder
                });

                const generator = playAnimation(slides, settings, undefined, { skipDelays: true });
                let frameCount = 0;
                const totalDuration = slides.reduce((acc, s) => acc + s.duration, 0) + (slides.length - 1);
                const totalFrames = Math.ceil(totalDuration * fps);
                const delay = 1000 / fps; // Delay in milliseconds

                for await (const frame of generator) {
                    if (cancelRef.current) {
                        onCancelled?.();
                        return;
                    }

                    // 1. Set state to render frame
                    setCurrentFrame(frame);

                    // 2. Wait for render
                    await new Promise<void>((resolve) => {
                        frameRenderedResolver.current = resolve;
                    });

                    // 3. Capture frame
                    if (containerRef.current) {
                        const canvas = await toCanvas(containerRef.current, {
                            width,
                            height,
                            pixelRatio: 1,
                            skipAutoScale: true,
                            filter: (node) => {
                                // Skip external stylesheets to avoid CORS errors
                                if (node instanceof HTMLLinkElement && node.rel === "stylesheet") {
                                    const href = node.href || "";
                                    if (href.includes("googleapis.com") || href.includes("cdn.")) {
                                        return false;
                                    }
                                }
                                return true;
                            },
                            style: {
                                transform: "scale(1)",
                                transformOrigin: "top left",
                            },
                        });

                        // Add frame to GIF
                        gif.addFrame(canvas, { delay, copy: true });
                    }

                    frameCount++;
                    // GIF encoding happens at the end, so we track capture progress up to 90%
                    onProgress(Math.min((frameCount / totalFrames) * 0.9, 0.9));
                }

                // Finalize GIF
                gif.on("finished", (blob: Blob) => {
                    onProgress(1);
                    onComplete(blob);
                });

                gif.on("progress", (p: number) => {
                    // Encoding progress from 90% to 100%
                    onProgress(0.9 + p * 0.1);
                });

                gif.render();
            } catch (error) {
                console.error("GIF export failed", error);
                onError(error as Error);
            } finally {
                processingRef.current = false;
            }
        };

        processAnimation();
    }, [settings, slides, editorSettings, onProgress, onComplete, onError, cancelled, onCancelled]);

    const { width, height } = getResolutionDimensions(settings.resolution);

    // Render content similar to UnifiedAnimationCanvas but scaled/fixed
    const renderContent = () => {
        if (!currentFrame) return null;

        if (currentFrame.type === "slide") {
            return (
                <MorphingCodeRenderer
                    fromCode={currentFrame.currentSlide.code}
                    toCode={currentFrame.currentSlide.code}
                    fromTitle={currentFrame.currentSlide.title}
                    toTitle={currentFrame.currentSlide.title}
                    language={currentFrame.currentSlide.language}
                    progress={1}
                    chromeless
                    scale={1.5}
                />
            );
        }

        const frame = currentFrame.frame;
        if (!frame) return null;

        const diffFrame = frame as unknown as any;
        return (
            <MorphingCodeRenderer
                fromCode={diffFrame.fromSlide.code}
                toCode={diffFrame.toSlide.code}
                fromTitle={diffFrame.fromSlide.title}
                toTitle={diffFrame.toSlide.title}
                language={diffFrame.toSlide.language}
                progress={diffFrame.progress}
                chromeless
                scale={1.5}
            />
        );
    };

    const activeSlide = currentFrame?.currentSlide || slides[0];
    const headerContent = (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-stone-500 dark:text-stone-400 text-md font-medium">{activeSlide?.title}</span>
        </div>
    );

    // Determine if background is dark for watermark color
    const isDarkBackground = [
        "sublime",
        "hyper",
        "dracula",
        "monokai",
        "nord",
        "gotham",
        "blue",
        "nightOwl",
    ].includes(editorSettings.backgroundTheme);

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                zIndex: -1000,
                opacity: 0,
                pointerEvents: "none",
            }}
        >
            <div
                ref={containerRef}
                style={{
                    width,
                    height,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    letterSpacing: 0,
                }}
            >
                {/* Aggressive letter-spacing reset for GIF export */}
                <style
                    dangerouslySetInnerHTML={{
                        __html: `
            #gif-export-container,
            #gif-export-container *,
            #gif-export-container span,
            #gif-export-container div {
              letter-spacing: 0 !important;
              font-feature-settings: "liga" 0, "calt" 0, "dlig" 0 !important;
              font-variant-ligatures: none !important;
              -webkit-font-feature-settings: "liga" 0, "calt" 0 !important;
              -moz-font-feature-settings: "liga" 0, "calt" 0 !important;
            }
          `,
                    }}
                />
                <div id="gif-export-container" style={{ width: "100%", height: "100%", letterSpacing: 0 }}>
                    <AnimationContainer
                        style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: 60,
                        }}
                    >
                        <div className="w-full max-w-3xl" style={{ transform: "scale(1.5)", letterSpacing: 0 }}>
                            <WindowChrome headerContent={headerContent} className="w-full">
                                {renderContent()}
                            </WindowChrome>
                        </div>
                    </AnimationContainer>

                    {/* Watermark */}
                    {!hideWatermark && (
                        <div
                            style={{
                                position: "absolute",
                                bottom: 24,
                                right: 32,
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                            }}
                        >
                            <span
                                className={cn(isDarkBackground ? "text-white" : "text-foreground")}
                                style={{
                                    fontSize: 18,
                                    fontWeight: 500,
                                    letterSpacing: "0.02em",
                                }}
                            >
                                jollycode.dev
                            </span>
                            <div>
                                <Logo
                                    variant="short"
                                    className={cn(
                                        "scale-75 grayscale contrast-150",
                                        isDarkBackground ? "text-white" : "text-foreground"
                                    )}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
